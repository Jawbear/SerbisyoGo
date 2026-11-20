package expo.modules.serbisyogointro

import android.app.Dialog
import android.content.Context
import android.graphics.Color
import android.graphics.drawable.ColorDrawable
import android.media.AudioManager
import android.net.Uri
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.util.Log
import android.view.Gravity
import android.view.View.MeasureSpec
import android.view.ViewGroup.LayoutParams.MATCH_PARENT
import android.widget.FrameLayout
import android.widget.VideoView
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.WindowInsetsControllerCompat
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleOwner
import expo.modules.kotlin.Promise
import expo.modules.kotlin.functions.Queues
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class SerbisyoGoIntroModule : Module() {
  private companion object {
    // Main-thread only. Activity recreation and a React remount share the same process.
    var played = false
    const val TIMEOUT_MS = 15_000L // Includes decoder startup and the six-second opening
  }

  private val main = Handler(Looper.getMainLooper())
  private var closeIntro: ((String) -> Unit)? = null

  override fun definition() = ModuleDefinition {
    Name("SerbisyoGoIntro")
    AsyncFunction("play") { promise: Promise ->
      val activity = appContext.currentActivity
      if (played || activity == null || activity.isFinishing || activity.isDestroyed ||
        (activity as? LifecycleOwner)?.lifecycle?.currentState?.isAtLeast(Lifecycle.State.RESUMED) == false) {
        promise.resolve(null)
        return@AsyncFunction
      }
      played = true
      val dialog = Dialog(activity, android.R.style.Theme_Material_NoActionBar_Fullscreen)
      val video = object : VideoView(activity) {
        override fun onMeasure(widthMeasureSpec: Int, heightMeasureSpec: Int) {
          // Fit the complete frame and avoid upscaling the 720p portrait master.
          val width = minOf(720, MeasureSpec.getSize(widthMeasureSpec))
          val height = minOf(1280, MeasureSpec.getSize(heightMeasureSpec))
          super.onMeasure(MeasureSpec.makeMeasureSpec(width, MeasureSpec.AT_MOST),
            MeasureSpec.makeMeasureSpec(height, MeasureSpec.AT_MOST))
        }
      }
      val timeout = Runnable { closeIntro?.invoke("timeout") }
      fun finish(reason: String) {
        if (closeIntro == null) return
        closeIntro = null
        main.removeCallbacks(timeout)
        video.setOnCompletionListener(null)
        video.setOnErrorListener(null)
        video.setOnPreparedListener(null)
        // A decoder can already be in its error state, or the activity window gone.
        try { video.stopPlayback() } catch (_: IllegalStateException) { }
        try { if (dialog.isShowing) dialog.dismiss() } catch (_: IllegalArgumentException) { }
        Log.i("SerbisyoGoIntro", "Opening ended: $reason")
        promise.resolve(null)
      }
      closeIntro = ::finish
      try {
        val frame = FrameLayout(activity).apply {
          setBackgroundColor(Color.BLACK)
          // VideoView measures to the original aspect ratio within these bounds.
          addView(video, FrameLayout.LayoutParams(MATCH_PARENT, MATCH_PARENT, Gravity.CENTER))
        }
        dialog.setContentView(frame)
        dialog.setCanceledOnTouchOutside(false)
        dialog.setOnDismissListener { finish("dismissed") } // Includes Android Back.
        val window = requireNotNull(dialog.window)
        window.setBackgroundDrawable(ColorDrawable(Color.BLACK))
        window.volumeControlStream = AudioManager.STREAM_MUSIC
        WindowCompat.setDecorFitsSystemWindows(window, false)
        val bars = WindowInsetsControllerCompat(window, window.decorView)
        bars.systemBarsBehavior = WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
        bars.hide(WindowInsetsCompat.Type.systemBars())
        dialog.show()
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
          video.setAudioFocusRequest(AudioManager.AUDIOFOCUS_GAIN_TRANSIENT)
        }
        video.contentDescription = "SerbisyoGo opening animation"
        video.setOnPreparedListener { player ->
          player.isLooping = false
          val audio = activity.getSystemService(Context.AUDIO_SERVICE) as AudioManager
          if (audio.ringerMode != AudioManager.RINGER_MODE_NORMAL) player.setVolume(0f, 0f)
          Log.i("SerbisyoGoIntro", "Opening prepared: ${player.videoWidth}x${player.videoHeight}")
        }
        video.setOnCompletionListener { finish("completed") }
        video.setOnErrorListener { _, what, extra -> finish("media error $what/$extra"); true }
        main.postDelayed(timeout, TIMEOUT_MS)
        video.setVideoURI(Uri.parse("android.resource://${activity.packageName}/${R.raw.serbisyogo_opening}"))
        video.start()
      } catch (_: RuntimeException) {
        finish("unavailable")
      }
    }.runOnQueue(Queues.MAIN)
    OnActivityEntersBackground { endPlayback() }
    OnActivityDestroys { endPlayback() }
    OnDestroy { endPlayback() }
  }

  private fun endPlayback() {
    if (Looper.myLooper() == Looper.getMainLooper()) closeIntro?.invoke("interrupted")
    else main.post { closeIntro?.invoke("interrupted") }
  }
}
