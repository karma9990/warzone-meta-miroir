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
SHA256: 47A1E14FD7171A1A341DC4E554E836A64D8E157425EAEBE2A97AE59ECBA7B8DF
Size: 34,513,063 bytes

dist\wzpro-companion\WZPRO Companion.exe
SHA256: 435345F581B29AE13E621A4F149A042E4ABA913394C800C8F7FD5EAA1D812405
Size: 109,056 bytes

dist\wzpro-companion\WZPRO Companion.zip
SHA256: DDAA83E5C668F02672C3BC8727A3D12975FAB6115B78FEB85633E874107A3400
Size: 53,541,867 bytes
```

This installer uses Inno Setup 6 and installs:

- `WZPRO Companion.exe`
- the packaged Node runtime
- the companion app engine
- the OCR dependencies
- the bundled font and icon assets

Without a code-signing certificate, Windows Smart App Control can still block the installer or the app. The installer makes distribution cleaner, but it does not replace signing.

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
