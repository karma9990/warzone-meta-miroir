#define AppName "WZPRO Companion"
#define AppPublisher "WZPRO"
#define AppExeName "WZPRO Companion.exe"
#define AppVersion GetEnv("WZPRO_COMPANION_VERSION")
#define SourceDir GetEnv("WZPRO_COMPANION_SOURCE")
#define OutputDir GetEnv("WZPRO_COMPANION_INSTALLER_OUTPUT")

[Setup]
AppId={{3F7F46D9-04E5-43C4-9B84-2A90AB7C0B2F}
AppName={#AppName}
AppVersion={#AppVersion}
AppPublisher={#AppPublisher}
DefaultDirName={autopf}\WZPRO Companion
DefaultGroupName=WZPRO Companion
DisableProgramGroupPage=yes
LicenseFile=
OutputDir={#OutputDir}
OutputBaseFilename=WZPRO Companion Setup
SetupIconFile=..\wzpro-companion.ico
Compression=lzma2
SolidCompression=yes
WizardStyle=modern
ArchitecturesInstallIn64BitMode=x64compatible
PrivilegesRequired=lowest
UninstallDisplayIcon={app}\{#AppExeName}
CloseApplications=yes

[Languages]
Name: "french"; MessagesFile: "compiler:Languages\French.isl"
Name: "english"; MessagesFile: "compiler:Default.isl"

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"; Flags: unchecked

[Files]
Source: "{#SourceDir}\WZPRO Companion.exe"; DestDir: "{app}"; Flags: ignoreversion
Source: "{#SourceDir}\runtime\*"; DestDir: "{app}\runtime"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "{#SourceDir}\app\*"; DestDir: "{app}\app"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "{#SourceDir}\node_modules\*"; DestDir: "{app}\node_modules"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "{#SourceDir}\eng.traineddata"; DestDir: "{app}"; Flags: ignoreversion skipifsourcedoesntexist

[Icons]
Name: "{group}\WZPRO Companion"; Filename: "{app}\{#AppExeName}"
Name: "{autodesktop}\WZPRO Companion"; Filename: "{app}\{#AppExeName}"; Tasks: desktopicon

[Run]
Filename: "{app}\{#AppExeName}"; Description: "{cm:LaunchProgram,WZPRO Companion}"; Flags: nowait postinstall skipifsilent
