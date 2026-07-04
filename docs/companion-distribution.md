# WZPRO Companion distribution

## Installer

Build the portable package first, then build the installer:

```powershell
npm run companion:build-exe
npm run companion:build-installer
```

The installer is generated at:

```text
dist\wzpro-companion-installer\WZPRO Companion Setup.exe
```

Current generated files:

```text
dist\wzpro-companion-installer\WZPRO Companion Setup.exe
SHA256: 662F5FAE45762C5349E5A1BB3DE0673E457EC746ADA71632F24E1D189B0F5A55
Size: 34,521,098 bytes

dist\wzpro-companion\WZPRO Companion.exe
SHA256: F7D552339BA138829379FC1318DCF619840BF88B329F5AEDFE0FE27CAB8017F0
Size: 123,904 bytes

dist\wzpro-companion\WZPRO Companion.zip
SHA256: CC29ED15E807954159E25954E9D51F23FF3C555C923722FD094B836DA9FD8840
Size: 53,547,291 bytes
```

This installer uses Inno Setup 6 and installs:

- `WZPRO Companion.exe`
- the packaged Node runtime
- the companion app engine
- the OCR dependencies
- the bundled font and icon assets

Without a code-signing certificate, Windows Smart App Control can still block the installer or the app. The installer makes distribution cleaner, but it does not replace signing.

For Store submissions, prefer a versioned URL:

```text
https://wzprometa.com/downloads/wzpro-companion/v0.1.0/WZPRO-Companion-Setup.exe
```

The latest URL remains:

```text
https://wzprometa.com/downloads/WZPRO-Companion-Setup.exe
```

## Microsoft Defender submission

Official portal:

```text
https://www.microsoft.com/en-us/wdsi/filesubmission
```

Recommended submission type:

```text
Software developer
```

Recommended product:

```text
Smart App Control
```

Recommended classification:

```text
Incorrectly detected as malware/malicious
```

Additional information to paste:

```text
WZPRO Companion is a clean desktop companion application for wzprometa.com. It helps users connect their WZPRO account and run a local Warzone statistics companion.

The application is built from our own source code and packages a local Node.js runtime plus OCR dependencies used by the companion engine. It does not install drivers, browser extensions, services, miners, or third-party bundled software. It connects only to wzprometa.com companion API endpoints after the user authorizes the device.

The file is currently being blocked by Smart App Control because it is unsigned / low reputation. We are submitting it as a false positive / clean application review.
```

Microsoft notes that the portal is for files believed to be incorrectly classified and that the maximum upload size is 50 MB. Submit the installer or the specific executable, not the zip, because the generated zip is over 50 MB.

## Microsoft Store path

Official policy page:

```text
https://learn.microsoft.com/windows/apps/publish/store-policies
```

Important requirements for the Companion:

- The app must be testable and functional.
- The first-run experience must clearly explain the app value.
- If login is required, provide Microsoft a working demo account in certification notes.
- Win32 apps need a privacy policy.
- The app must not compromise security or use undisclosed dynamic code.
- If using a direct HTTPS installer URL for a Win32 app, Microsoft requires `.exe` or `.msi`, versioned download URLs, silent install behavior, and signed PE files.

This means the Store path is useful for trust, but it does not fully remove the signing problem if we submit as a direct Win32 installer URL.
