package expo.modules.serbisyogoupdater

import android.content.ClipData
import android.content.Intent
import android.content.pm.ApplicationInfo
import android.content.pm.PackageInfo
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.provider.Settings
import androidx.core.content.FileProvider
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.io.File
import java.net.HttpURLConnection
import java.net.URL
import java.security.MessageDigest
import java.util.concurrent.atomic.AtomicBoolean

@Suppress("DEPRECATION")
class SerbisyoGoUpdaterModule : Module() {
  private val downloading = AtomicBoolean(false)
  private val cancelled = AtomicBoolean(false)
  private var ready: Ready? = null
  private data class Ready(val file: File, val hash: String, val size: Long, val code: Long)
  private val context get() = appContext.reactContext ?: error("The app is not ready. Try again.")
  private val certificate = "671506d9e3247ef43ae8d77d17f0a59afc9ba9b26cde855e90456a2a3becfefa"

  override fun definition() = ModuleDefinition {
    Name("SerbisyoGoUpdater")
    Events("downloadProgress")
    Function("installedVersion") {
      val info = context.packageManager.getPackageInfo(context.packageName, 0)
      mapOf("versionName" to (info.versionName ?: ""), "versionCode" to code(info), "sdkInt" to Build.VERSION.SDK_INT)
    }
    Function("cancelDownload") { cancelled.set(true) }
    AsyncFunction("prepareUpdate") { address: String, hash: String, size: Double, version: Double ->
      require(downloading.compareAndSet(false, true)) { "An update download is already running." }
      cancelled.set(false)
      ready = null
      try {
        require(size.isFinite() && size % 1.0 == 0.0 && size in 1.0..157286400.0) { "Invalid update size." }
        require(version.isFinite() && version % 1.0 == 0.0 && version > 0) { "Invalid update version." }
        require(hash.matches(Regex("[a-f0-9]{64}"))) { "Invalid update checksum." }
        val url = URL(address)
        require(url.protocol == "https" && url.host == "github.com" && url.port == -1 && url.userInfo == null && url.query == null && url.ref == null &&
          url.path.matches(Regex("/Jawbear/SerbisyoGo/releases/download/android-v[0-9]+\\.[0-9]+\\.[0-9]+/SerbisyoGo-[0-9]+\\.[0-9]+\\.[0-9]+\\.apk"))) { "Untrusted update download address." }
        val directory = File(context.cacheDir, "updates").apply { mkdirs() }
        val file = File(directory, "update.apk")
        val candidate = Ready(file, hash, size.toLong(), version.toLong())
        val reusable = file.exists() && runCatching { verify(candidate) }.isSuccess
        if (!reusable) {
          file.delete()
          try { download(url, candidate) } catch (failure: Exception) { file.delete(); throw failure }
        }
        require(!cancelled.get()) { "Update download cancelled." }
        verify(candidate)
        ready = candidate
        mapOf("ready" to true)
      } finally { downloading.set(false) }
    }
    AsyncFunction("installUpdate") {
      val candidate = ready ?: error("Download the update before installing it.")
      verify(candidate)
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && !context.packageManager.canRequestPackageInstalls()) {
        context.startActivity(Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES, Uri.parse("package:${context.packageName}")).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
        "permission_required"
      } else {
        val uri = FileProvider.getUriForFile(context, "${context.packageName}.updates", candidate.file)
        val intent = Intent(Intent.ACTION_INSTALL_PACKAGE).apply {
          setDataAndType(uri, "application/vnd.android.package-archive")
          clipData = ClipData.newRawUri("SerbisyoGo update", uri)
          addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION or Intent.FLAG_ACTIVITY_NEW_TASK)
        }
        context.startActivity(intent)
        "installer_opened"
      }
    }
  }

  private fun code(info: PackageInfo): Long = if (Build.VERSION.SDK_INT >= 28) info.longVersionCode else info.versionCode.toLong()
  private fun hex(bytes: ByteArray) = bytes.joinToString("") { "%02x".format(it.toInt() and 255) }
  private fun signers(info: PackageInfo): Set<String> {
    val signatures = if (Build.VERSION.SDK_INT >= 28) info.signingInfo?.apkContentsSigners else info.signatures
    return signatures?.map { hex(MessageDigest.getInstance("SHA-256").digest(it.toByteArray())) }?.toSet() ?: emptySet()
  }
  private fun verify(candidate: Ready) {
    require(candidate.file.isFile && candidate.file.length() == candidate.size) { "The update download is incomplete. Download it again." }
    val digest = MessageDigest.getInstance("SHA-256")
    candidate.file.inputStream().use { input -> val buffer = ByteArray(65536); var length: Int
      while (input.read(buffer).also { length = it } != -1) digest.update(buffer, 0, length)
    }
    require(hex(digest.digest()) == candidate.hash) { "The update checksum did not match. Download it again." }
    val pm = context.packageManager
    val flags = if (Build.VERSION.SDK_INT >= 28) PackageManager.GET_SIGNING_CERTIFICATES else PackageManager.GET_SIGNATURES
    val archive = pm.getPackageArchiveInfo(candidate.file.absolutePath, flags) ?: error("The update is not a valid Android APK.")
    val installed = pm.getPackageInfo(context.packageName, flags)
    require(archive.packageName == context.packageName && context.packageName == "com.serbisyogo.mobile") { "The update belongs to a different app." }
    require(code(archive) == candidate.code && candidate.code > code(installed)) { "This update is not newer than the installed app." }
    require(archive.applicationInfo?.flags?.and(ApplicationInfo.FLAG_DEBUGGABLE) == 0) { "A development build cannot be installed as an update." }
    require(signers(archive) == setOf(certificate) && signers(installed) == setOf(certificate)) { "The update signing certificate did not match SerbisyoGo." }
  }
  private fun download(initial: URL, candidate: Ready) {
    var url = initial
    var connection: HttpURLConnection? = null
    try {
      for (redirect in 0..5) {
        require(url.protocol == "https" && url.userInfo == null && (url.host == "github.com" || url.host == "release-assets.githubusercontent.com" || url.host == "objects.githubusercontent.com")) { "Untrusted update redirect." }
        val current = (url.openConnection() as HttpURLConnection).apply {
          connectTimeout = 20000; readTimeout = 20000; instanceFollowRedirects = false
          setRequestProperty("Accept", "application/octet-stream")
          setRequestProperty("Accept-Encoding", "identity")
        }
        connection = current
        val status = current.responseCode
        if (status in listOf(301, 302, 303, 307, 308)) {
          val next = current.getHeaderField("Location") ?: error("The update redirect is missing.")
          current.disconnect(); connection = null; url = URL(url, next)
          continue
        }
        require(status == 200) { "The update server is unavailable. Try again later." }
        val length = current.contentLengthLong
        require(length == -1L || length == candidate.size) { "The update size does not match the release." }
        val start = System.currentTimeMillis(); var last = 0L; var received = 0L
        current.inputStream.use { input -> candidate.file.outputStream().use { output ->
          val buffer = ByteArray(65536); var count: Int
          while (input.read(buffer).also { count = it } != -1) {
            require(!cancelled.get()) { "Update download cancelled." }
            require(System.currentTimeMillis() - start < 600000) { "The update download timed out. Try again." }
            received += count
            require(received <= candidate.size) { "The update exceeds its declared size." }
            output.write(buffer, 0, count)
            if (System.currentTimeMillis() - last > 250 || received == candidate.size) {
              sendEvent("downloadProgress", mapOf("received" to received, "total" to candidate.size))
              last = System.currentTimeMillis()
            }
          }
        } }
        require(received == candidate.size) { "The update download is incomplete. Try again." }
        return
      }
      error("Too many update redirects.")
    } finally { connection?.disconnect() }
  }
}
