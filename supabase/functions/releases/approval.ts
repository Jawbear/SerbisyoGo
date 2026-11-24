/** The signing owner sets this digest after apksigner verifies the release certificate. */
export function requireApprovedApk(actual: string, approved: string | undefined) {
  if (!approved || !/^[0-9a-f]{64}$/i.test(approved)) {
    throw new Error('Release upload requires the signing owner to configure the verified signed APK digest.');
  }
  if (actual !== approved.toLowerCase()) {
    throw new Error('This APK does not match the approved signed artifact.');
  }
}
