using System;
using System.Diagnostics;
using System.Drawing;
using System.IO;
using System.Net;
using System.Net.Http;
using System.Text;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using System.Windows.Forms;

public sealed class WzproCompanionApp : Form
{
    private readonly string root;
    private readonly string nodePath;
    private readonly string engineScript;
    private readonly string engineWorkingDirectory;
    private readonly string sessionDir;
    private readonly string sessionPath;
    private readonly string site;
    private readonly HttpClient http = new HttpClient();

    private Process companionProcess;
    private NotifyIcon tray;
    private Timer outputTimer;
    private Timer loginPollTimer;
    private readonly System.Collections.Concurrent.ConcurrentQueue<string> pendingLines = new System.Collections.Concurrent.ConcurrentQueue<string>();

    private Label statusLabel;
    private Label connectionLabel;
    private Label titleLabel;
    private Label leadLabel;
    private Label hintLabel;
    private Label verifyLabel;
    private Label secondsLabel;
    private Label importsLabel;
    private Label journalLabel;
    private Button connectButton;
    private Button themeButton;
    private Button startButton;
    private Button stopButton;
    private ComboBox languageBox;
    private NumericUpDown pollBox;
    private ListBox historyList;
    private TextBox logBox;
    private ToolStripMenuItem trayShowItem;
    private ToolStripMenuItem trayStartItem;
    private ToolStripMenuItem trayStopItem;
    private ToolStripMenuItem trayQuitItem;

    private string deviceToken = "";
    private string connectedName = "";
    private string deviceCode = "";
    private string deviceId = "";
    private string themeMode = "dark";
    private string languageCode = "fr";
    private bool updatingLanguageUi;
    private bool pollingLogin;
    private bool allowExit;
    private bool minimizeNoticeShown;
    private int historyCount;

    [STAThread]
    public static void Main(string[] args)
    {
        Application.EnableVisualStyles();
        Application.SetCompatibleTextRenderingDefault(false);
        Application.Run(new WzproCompanionApp(args));
    }

    public WzproCompanionApp(string[] args)
    {
        ServicePointManager.SecurityProtocol = SecurityProtocolType.Tls12;
        string exeDir = AppDomain.CurrentDomain.BaseDirectory;
        string bundleNodePath = Path.Combine(exeDir, "runtime", "node.exe");
        string bundleEngineScript = Path.Combine(exeDir, "app", "wzpro-companion.mjs");
        if (File.Exists(bundleNodePath) && File.Exists(bundleEngineScript))
        {
            root = exeDir;
            nodePath = bundleNodePath;
            engineScript = bundleEngineScript;
            engineWorkingDirectory = exeDir;
        }
        else
        {
            root = Path.GetFullPath(Path.Combine(exeDir, "..", ".."));
            nodePath = "node.exe";
            engineScript = Path.Combine(root, "scripts", "wzpro-companion.mjs");
            engineWorkingDirectory = root;
        }
        site = GetArg(args, "-Site") ?? Environment.GetEnvironmentVariable("WZPRO_SITE") ?? "https://wzprometa.com";
        site = site.TrimEnd('/');
        sessionDir = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData), "WZPRO Companion");
        sessionPath = Path.Combine(sessionDir, "session.txt");

        BuildUi();
        BuildTray();
        BuildTimers();
        LoadSession();
        ApplyTheme();
        ApplyLanguage();
        RefreshConnectionUi();
        AddLogLine(T("ready"));
        AddLogLine(T("site") + site);
    }

    private static string GetArg(string[] args, string name)
    {
        for (int i = 0; i < args.Length - 1; i++)
        {
            if (string.Equals(args[i], name, StringComparison.OrdinalIgnoreCase)) return args[i + 1];
        }
        return null;
    }

    private void BuildUi()
    {
        Text = "WZPRO Companion";
        Size = new Size(760, 560);
        MinimumSize = new Size(680, 500);
        StartPosition = FormStartPosition.CenterScreen;
        Font = new Font("Consolas", 9);

        titleLabel = Label("WZPRO COMPANION", 20, 18, 360, 32, 18, FontStyle.Bold, Color.White);
        Controls.Add(titleLabel);

        languageBox = new ComboBox
        {
            DropDownStyle = ComboBoxStyle.DropDownList,
            Location = new Point(496, 22),
            Size = new Size(88, 28),
            Font = new Font("Consolas", 8, FontStyle.Bold)
        };
        languageBox.Items.AddRange(new object[] { "FR", "EN", "ES" });
        languageBox.SelectedIndexChanged += delegate { OnLanguageChanged(); };
        Controls.Add(languageBox);

        themeButton = Button("MODE CLAIR", 594, 22, 116, 28, Color.FromArgb(22, 60, 255));
        themeButton.Click += delegate { ToggleTheme(); };
        Controls.Add(themeButton);

        leadLabel = Label("", 22, 54, 690, 20, 9, FontStyle.Regular, Color.FromArgb(185, 185, 185));
        Controls.Add(leadLabel);

        statusLabel = Label("", 22, 78, 460, 24, 10, FontStyle.Bold, Color.FromArgb(185, 185, 185));
        Controls.Add(statusLabel);

        connectionLabel = Label("", 22, 118, 320, 24, 10, FontStyle.Bold, Color.FromArgb(255, 204, 0));
        Controls.Add(connectionLabel);

        connectButton = Button("", 374, 112, 336, 34, Color.FromArgb(22, 60, 255));
        connectButton.Click += async delegate { await StartLoginFlow(); };
        Controls.Add(connectButton);

        verifyLabel = Label("", 22, 166, 120, 20, 9, FontStyle.Regular, Color.White);
        Controls.Add(verifyLabel);
        pollBox = new NumericUpDown
        {
            Minimum = 3,
            Maximum = 30,
            Increment = 1,
            Value = 5,
            Location = new Point(150, 162),
            Size = new Size(120, 24),
            BackColor = Color.FromArgb(14, 18, 45),
            ForeColor = Color.White
        };
        Controls.Add(pollBox);
        secondsLabel = Label("", 278, 166, 90, 20, 9, FontStyle.Regular, Color.White);
        Controls.Add(secondsLabel);

        startButton = Button("", 374, 160, 120, 30, Color.FromArgb(22, 60, 255));
        startButton.Click += delegate { StartCompanion(); };
        Controls.Add(startButton);

        stopButton = Button("", 506, 160, 120, 30, Color.FromArgb(42, 42, 48));
        stopButton.Enabled = false;
        stopButton.Click += delegate { StopCompanion(); };
        Controls.Add(stopButton);

        hintLabel = Label("", 22, 198, 690, 34, 9, FontStyle.Regular, Color.FromArgb(150, 150, 155));
        Controls.Add(hintLabel);

        importsLabel = Label("", 22, 246, 160, 20, 9, FontStyle.Bold, Color.White);
        Controls.Add(importsLabel);
        historyList = new ListBox
        {
            Location = new Point(22, 270),
            Size = new Size(314, 204),
            BackColor = Color.FromArgb(4, 4, 6),
            ForeColor = Color.White,
            BorderStyle = BorderStyle.FixedSingle
        };
        Controls.Add(historyList);

        journalLabel = Label("", 356, 246, 160, 20, 9, FontStyle.Bold, Color.White);
        Controls.Add(journalLabel);
        logBox = new TextBox
        {
            Location = new Point(356, 270),
            Size = new Size(344, 204),
            Multiline = true,
            ScrollBars = ScrollBars.Vertical,
            ReadOnly = true,
            BackColor = Color.FromArgb(4, 4, 6),
            ForeColor = Color.FromArgb(220, 220, 225),
            BorderStyle = BorderStyle.FixedSingle
        };
        Controls.Add(logBox);
    }

    private Label Label(string text, int x, int y, int w, int h, float size, FontStyle style, Color color)
    {
        return new Label
        {
            Text = text,
            Location = new Point(x, y),
            Size = new Size(w, h),
            Font = new Font("Consolas", size, style),
            ForeColor = color
        };
    }

    private Button Button(string text, int x, int y, int w, int h, Color color)
    {
        var button = new Button
        {
            Text = text,
            Location = new Point(x, y),
            Size = new Size(w, h),
            BackColor = color,
            ForeColor = Color.White,
            FlatStyle = FlatStyle.Flat,
            Font = new Font("Consolas", 8, FontStyle.Bold)
        };
        button.FlatAppearance.BorderSize = 1;
        button.FlatAppearance.BorderColor = color;
        return button;
    }

    private sealed class WzTheme
    {
        public Color Canvas;
        public Color Surface;
        public Color SurfaceAlt;
        public Color Ink;
        public Color Muted;
        public Color Line;
        public Color Blue;
        public Color BlueText;
        public Color Warn;
        public Color Success;
        public Color Info;

        public static WzTheme Dark()
        {
            return new WzTheme
            {
                Canvas = Color.FromArgb(5, 5, 6),
                Surface = Color.FromArgb(16, 16, 14),
                SurfaceAlt = Color.FromArgb(22, 22, 24),
                Ink = Color.FromArgb(243, 246, 239),
                Muted = Color.FromArgb(184, 186, 178),
                Line = Color.FromArgb(22, 60, 255),
                Blue = Color.FromArgb(22, 60, 255),
                BlueText = Color.FromArgb(239, 238, 232),
                Warn = Color.FromArgb(255, 204, 0),
                Success = Color.FromArgb(0, 230, 140),
                Info = Color.FromArgb(0, 180, 255)
            };
        }

        public static WzTheme Light()
        {
            return new WzTheme
            {
                Canvas = Color.FromArgb(239, 238, 232),
                Surface = Color.FromArgb(250, 247, 239),
                SurfaceAlt = Color.FromArgb(231, 229, 220),
                Ink = Color.FromArgb(16, 16, 14),
                Muted = Color.FromArgb(92, 90, 84),
                Line = Color.FromArgb(202, 199, 188),
                Blue = Color.FromArgb(22, 60, 255),
                BlueText = Color.FromArgb(239, 238, 232),
                Warn = Color.FromArgb(153, 112, 0),
                Success = Color.FromArgb(0, 120, 76),
                Info = Color.FromArgb(22, 60, 255)
            };
        }
    }

    private WzTheme Theme
    {
        get { return themeMode == "light" ? WzTheme.Light() : WzTheme.Dark(); }
    }

    private string T(string key)
    {
        if (languageCode == "en")
        {
            switch (key)
            {
                case "title": return "WZPRO COMPANION";
                case "lead": return "Connect this app to your WZPRO account, then let it watch Warzone while you play.";
                case "themeLight": return "LIGHT MODE";
                case "themeDark": return "DARK MODE";
                case "stopped": return "Stopped";
                case "disconnected": return "Not connected";
                case "connect": return "CONNECT TO WZPRO";
                case "reconnect": return "RECONNECT";
                case "verifyEvery": return "Check every";
                case "seconds": return "seconds";
                case "start": return "START";
                case "stop": return "STOP";
                case "hint": return "Connection opens your browser. Once authorized on the site, the key stays hidden in this app.";
                case "imports": return "Imports";
                case "journal": return "Log";
                case "ready": return "Ready. Start when Warzone is open.";
                case "site": return "WZPRO site: ";
                case "connecting": return "Connecting...";
                case "loginImpossible": return "Connection impossible";
                case "loginFailed": return "Login failed: ";
                case "openBrowserCode": return "Open browser authorization code ";
                case "connectedAs": return "Connected to WZPRO as ";
                case "expired": return "Connection code expired. Start again.";
                case "waitingAuth": return "Waiting for authorization: ";
                case "connectFirst": return "Connect WZPRO Companion to your account first.";
                case "engineMissing": return "WZPRO engine not found.";
                case "starting": return "Starting...";
                case "startingFor": return "Starting companion for ";
                case "stopping": return "Stopping companion...";
                case "stopFailed": return "Stop failed: ";
                case "warzoneMissing": return "Warzone not detected";
                case "warzoneFocus": return "Warzone open - focus the game";
                case "watching": return "Warzone active - watching";
                case "gameImported": return "Game imported";
                case "waiting": return "Waiting";
                case "show": return "Show";
                case "quit": return "Quit completely";
                case "trayStopped": return "WZPRO Companion - Stopped";
                case "trayWaitingWarzone": return "WZPRO Companion - Waiting for Warzone";
                case "trayWaitingFocus": return "WZPRO Companion - Waiting for focus";
                case "trayWatching": return "WZPRO Companion - Watching Warzone";
                case "minimizeTitle": return "WZprometa";
                case "minimizeNotice": return "WZprometa is minimized to the tray.";
                case "minimizeBody": return "The app can keep running in the background. You can also quit the application completely.";
                case "reduce": return "MINIMIZE";
                case "quitDialog": return "QUIT COMPLETELY";
                case "gamePrefix": return "Game ";
                case "joinFailed": return "Unable to reach ";
                case "joinAdvice": return ". Check your internet connection or restart the app with -Site https://wzprometa.com.";
            }
        }
        else if (languageCode == "es")
        {
            switch (key)
            {
                case "title": return "WZPRO COMPANION";
                case "lead": return "Conecta esta app a tu cuenta WZPRO y dejala vigilar Warzone mientras juegas.";
                case "themeLight": return "MODO CLARO";
                case "themeDark": return "MODO OSCURO";
                case "stopped": return "Detenido";
                case "disconnected": return "No conectado";
                case "connect": return "CONECTAR A WZPRO";
                case "reconnect": return "RECONECTAR";
                case "verifyEvery": return "Comprobar cada";
                case "seconds": return "segundos";
                case "start": return "INICIAR";
                case "stop": return "PARAR";
                case "hint": return "La conexion abre tu navegador. Una vez autorizada en el sitio, la clave queda oculta en esta app.";
                case "imports": return "Importaciones";
                case "journal": return "Registro";
                case "ready": return "Listo. Inicia cuando Warzone este abierto.";
                case "site": return "Sitio WZPRO: ";
                case "connecting": return "Conectando...";
                case "loginImpossible": return "Conexion imposible";
                case "loginFailed": return "Error de conexion: ";
                case "openBrowserCode": return "Abrir codigo de autorizacion en el navegador ";
                case "connectedAs": return "Conectado a WZPRO como ";
                case "expired": return "El codigo de conexion expiro. Vuelve a empezar.";
                case "waitingAuth": return "Esperando autorizacion: ";
                case "connectFirst": return "Primero conecta WZPRO Companion a tu cuenta.";
                case "engineMissing": return "Motor WZPRO no encontrado.";
                case "starting": return "Iniciando...";
                case "startingFor": return "Iniciando companion para ";
                case "stopping": return "Deteniendo companion...";
                case "stopFailed": return "Error al detener: ";
                case "warzoneMissing": return "Warzone no detectado";
                case "warzoneFocus": return "Warzone abierto - activa el juego";
                case "watching": return "Warzone activo - vigilancia";
                case "gameImported": return "Partida importada";
                case "waiting": return "En espera";
                case "show": return "Mostrar";
                case "quit": return "Cerrar totalmente";
                case "trayStopped": return "WZPRO Companion - Detenido";
                case "trayWaitingWarzone": return "WZPRO Companion - Esperando Warzone";
                case "trayWaitingFocus": return "WZPRO Companion - Esperando foco";
                case "trayWatching": return "WZPRO Companion - Vigilando Warzone";
                case "minimizeTitle": return "WZprometa";
                case "minimizeNotice": return "WZprometa esta minimizado en la bandeja.";
                case "minimizeBody": return "La app puede seguir funcionando en segundo plano. Tambien puedes cerrarla totalmente.";
                case "reduce": return "MINIMIZAR";
                case "quitDialog": return "CERRAR TOTALMENTE";
                case "gamePrefix": return "Partida ";
                case "joinFailed": return "No se puede contactar ";
                case "joinAdvice": return ". Comprueba tu conexion a internet o reinicia la app con -Site https://wzprometa.com.";
            }
        }

        switch (key)
        {
            case "title": return "WZPRO COMPANION";
            case "lead": return "Connecte cette app a ton compte WZPRO, puis laisse-la surveiller Warzone quand tu joues.";
            case "themeLight": return "MODE CLAIR";
            case "themeDark": return "MODE SOMBRE";
            case "stopped": return "Arrete";
            case "disconnected": return "Non connecte";
            case "connect": return "SE CONNECTER A WZPRO";
            case "reconnect": return "RECONNECTER";
            case "verifyEvery": return "Verifier toutes";
            case "seconds": return "secondes";
            case "start": return "START";
            case "stop": return "STOP";
            case "hint": return "La connexion ouvre ton navigateur. Une fois autorisee sur le site, la cle reste cachee dans cette app.";
            case "imports": return "Imports";
            case "journal": return "Journal";
            case "ready": return "Pret. Lance quand Warzone est ouvert.";
            case "site": return "Site WZPRO: ";
            case "connecting": return "Connexion en cours...";
            case "loginImpossible": return "Connexion impossible";
            case "loginFailed": return "Connexion echouee : ";
            case "openBrowserCode": return "Ouverture du navigateur avec le code ";
            case "connectedAs": return "Connecte a WZPRO en tant que ";
            case "expired": return "Le code de connexion a expire. Recommence.";
            case "waitingAuth": return "En attente d autorisation : ";
            case "connectFirst": return "Connecte d'abord WZPRO Companion a ton compte.";
            case "engineMissing": return "Moteur WZPRO introuvable.";
            case "starting": return "Demarrage...";
            case "startingFor": return "Demarrage du companion pour ";
            case "stopping": return "Arret du companion...";
            case "stopFailed": return "Arret impossible : ";
            case "warzoneMissing": return "Warzone non detecte";
            case "warzoneFocus": return "Warzone ouvert - active le jeu";
            case "watching": return "Warzone actif - surveillance";
            case "gameImported": return "Game importee";
            case "waiting": return "En attente";
            case "show": return "Afficher";
            case "quit": return "Fermer totalement";
            case "trayStopped": return "WZPRO Companion - Arrete";
            case "trayWaitingWarzone": return "WZPRO Companion - En attente de Warzone";
            case "trayWaitingFocus": return "WZPRO Companion - En attente du focus";
            case "trayWatching": return "WZPRO Companion - Surveillance Warzone";
            case "minimizeTitle": return "WZprometa";
            case "minimizeNotice": return "WZprometa est reduit dans les applications.";
            case "minimizeBody": return "L app peut continuer en arriere-plan. Tu peux aussi fermer totalement l application.";
            case "reduce": return "REDUIRE";
            case "quitDialog": return "FERMER TOTALEMENT";
            case "gamePrefix": return "Game ";
            case "joinFailed": return "Impossible de joindre ";
            case "joinAdvice": return ". Verifie ta connexion internet ou relance l'app avec -Site https://wzprometa.com.";
        }
        return key;
    }

    private bool IsRunning
    {
        get { return companionProcess != null && !companionProcess.HasExited; }
    }

    private void ToggleTheme()
    {
        themeMode = themeMode == "light" ? "dark" : "light";
        ApplyTheme();
        ApplyLanguage();
        RefreshConnectionUi();
        if (!IsRunning) SetRunningState(false);
        SaveSession();
    }

    private void OnLanguageChanged()
    {
        if (updatingLanguageUi || languageBox.SelectedItem == null) return;
        languageCode = languageBox.SelectedItem.ToString().ToLowerInvariant();
        ApplyLanguage();
        RefreshConnectionUi();
        if (!IsRunning) SetRunningState(false);
        SaveSession();
    }

    private void ApplyLanguage()
    {
        Text = "WZPRO Companion";
        titleLabel.Text = T("title");
        leadLabel.Text = T("lead");
        verifyLabel.Text = T("verifyEvery");
        secondsLabel.Text = T("seconds");
        startButton.Text = T("start");
        stopButton.Text = T("stop");
        hintLabel.Text = T("hint");
        importsLabel.Text = T("imports");
        journalLabel.Text = T("journal");
        themeButton.Text = themeMode == "light" ? T("themeDark") : T("themeLight");

        updatingLanguageUi = true;
        languageBox.SelectedItem = languageCode.ToUpperInvariant();
        updatingLanguageUi = false;

        if (trayShowItem != null) trayShowItem.Text = T("show");
        if (trayStartItem != null) trayStartItem.Text = T("start");
        if (trayStopItem != null) trayStopItem.Text = T("stop");
        if (trayQuitItem != null) trayQuitItem.Text = T("quit");
        if (tray != null && !IsRunning) tray.Text = T("trayStopped");
    }

    private void ApplyTheme()
    {
        var theme = Theme;
        BackColor = theme.Canvas;
        ForeColor = theme.Ink;

        ApplyThemeToControls(Controls, theme);

        titleLabel.ForeColor = theme.Blue;
        leadLabel.ForeColor = theme.Muted;
        hintLabel.ForeColor = theme.Muted;
        verifyLabel.ForeColor = theme.Ink;
        secondsLabel.ForeColor = theme.Ink;
        importsLabel.ForeColor = theme.Blue;
        journalLabel.ForeColor = theme.Blue;

        StylePrimaryButton(connectButton, theme);
        StylePrimaryButton(startButton, theme);
        StyleSecondaryButton(stopButton, theme);
        StyleSecondaryButton(themeButton, theme);
        StyleComboBox(languageBox, theme);
    }

    private void ApplyThemeToControls(Control.ControlCollection controls, WzTheme theme)
    {
        foreach (Control control in controls)
        {
            if (control is Label)
            {
                control.BackColor = Color.Transparent;
                control.ForeColor = theme.Ink;
            }
            else if (control is TextBox || control is ListBox || control is NumericUpDown)
            {
                control.BackColor = theme.Surface;
                control.ForeColor = theme.Ink;
            }
            else if (control is Button)
            {
                control.BackColor = theme.SurfaceAlt;
                control.ForeColor = theme.Ink;
            }

            if (control.HasChildren) ApplyThemeToControls(control.Controls, theme);
        }
    }

    private void StylePrimaryButton(Button button, WzTheme theme)
    {
        if (button == null) return;
        button.BackColor = theme.Blue;
        button.ForeColor = theme.BlueText;
        button.FlatAppearance.BorderColor = theme.Blue;
        button.FlatAppearance.MouseOverBackColor = theme.Blue;
        button.FlatAppearance.MouseDownBackColor = theme.Blue;
    }

    private void StyleSecondaryButton(Button button, WzTheme theme)
    {
        if (button == null) return;
        button.BackColor = theme.SurfaceAlt;
        button.ForeColor = theme.Ink;
        button.FlatAppearance.BorderColor = theme.Line;
        button.FlatAppearance.MouseOverBackColor = theme.Surface;
        button.FlatAppearance.MouseDownBackColor = theme.SurfaceAlt;
    }

    private void StyleComboBox(ComboBox comboBox, WzTheme theme)
    {
        if (comboBox == null) return;
        comboBox.BackColor = theme.SurfaceAlt;
        comboBox.ForeColor = theme.Ink;
    }

    private void BuildTray()
    {
        var menu = new ContextMenuStrip();
        trayShowItem = new ToolStripMenuItem(T("show"), null, delegate { ShowFromBackground(); });
        trayStartItem = new ToolStripMenuItem(T("start"), null, delegate { StartCompanion(); });
        trayStopItem = new ToolStripMenuItem(T("stop"), null, delegate { StopCompanion(); });
        trayQuitItem = new ToolStripMenuItem(T("quit"), null, delegate { allowExit = true; StopCompanion(); tray.Visible = false; Close(); });
        menu.Items.AddRange(new ToolStripItem[] { trayShowItem, trayStartItem, trayStopItem, trayQuitItem });

        tray = new NotifyIcon();
        string bundleIconPath = Path.Combine(root, "app", "wzpro-companion.ico");
        string iconPath = File.Exists(bundleIconPath) ? bundleIconPath : Path.Combine(root, "scripts", "wzpro-companion.ico");
        if (File.Exists(iconPath))
        {
            try
            {
                Icon icon = new Icon(iconPath);
                tray.Icon = icon;
                Icon = icon;
            }
            catch
            {
                tray.Icon = SystemIcons.Application;
            }
        }
        else
        {
            tray.Icon = SystemIcons.Application;
        }
        tray.Text = T("trayStopped");
        tray.Visible = true;
        tray.ContextMenuStrip = menu;
        tray.DoubleClick += delegate { ShowFromBackground(); };
    }

    private void BuildTimers()
    {
        outputTimer = new Timer { Interval = 300 };
        outputTimer.Tick += delegate
        {
            string line;
            while (pendingLines.TryDequeue(out line)) AddLogLine(line);
            if (companionProcess != null && companionProcess.HasExited) SetRunningState(false);
        };
        outputTimer.Start();

        loginPollTimer = new Timer { Interval = 2200 };
        loginPollTimer.Tick += async delegate { await PollLoginFlow(); };

        Resize += delegate
        {
            if (WindowState == FormWindowState.Minimized) HideToBackground();
        };

        FormClosing += delegate(object sender, FormClosingEventArgs e)
        {
            if (!allowExit)
            {
                DialogResult choice = ShowCloseChoice();
                if (choice == DialogResult.OK)
                {
                    allowExit = true;
                    StopCompanion();
                    loginPollTimer.Stop();
                    outputTimer.Stop();
                    tray.Visible = false;
                    tray.Dispose();
                }
                else
                {
                    e.Cancel = true;
                    HideToBackground();
                }
                return;
            }
            StopCompanion();
            loginPollTimer.Stop();
            outputTimer.Stop();
            tray.Visible = false;
            tray.Dispose();
        };
    }

    private void LoadSession()
    {
        try
        {
            if (!File.Exists(sessionPath)) return;
            string text = File.ReadAllText(sessionPath);
            deviceToken = ExtractLine(text, "token");
            connectedName = ExtractLine(text, "userName");
            string savedTheme = ExtractLine(text, "theme");
            if (savedTheme == "light" || savedTheme == "dark") themeMode = savedTheme;
            string savedLanguage = ExtractLine(text, "language");
            if (savedLanguage == "fr" || savedLanguage == "en" || savedLanguage == "es") languageCode = savedLanguage;
        }
        catch
        {
            deviceToken = "";
            connectedName = "";
        }
    }

    private void SaveSession()
    {
        Directory.CreateDirectory(sessionDir);
        File.WriteAllText(sessionPath, "site=" + site + Environment.NewLine + "token=" + deviceToken + Environment.NewLine + "userName=" + connectedName + Environment.NewLine + "theme=" + themeMode + Environment.NewLine + "language=" + languageCode, Encoding.UTF8);
    }

    private static string ExtractLine(string text, string key)
    {
        foreach (string line in text.Split(new[] { "\r\n", "\n" }, StringSplitOptions.None))
        {
            if (line.StartsWith(key + "=", StringComparison.OrdinalIgnoreCase)) return line.Substring(key.Length + 1).Trim();
        }
        return "";
    }

    private async Task<string> ApiPost(string path, string json)
    {
        try
        {
            using (var content = new StringContent(json, Encoding.UTF8, "application/json"))
            using (HttpResponseMessage response = await http.PostAsync(site + path, content))
            {
                string body = await response.Content.ReadAsStringAsync();
                if (!response.IsSuccessStatusCode) throw new Exception(body);
                return body;
            }
        }
        catch (HttpRequestException ex)
        {
            string detail = ex.InnerException != null ? " Detail: " + ex.InnerException.Message : "";
            throw new Exception(T("joinFailed") + site + T("joinAdvice") + detail, ex);
        }
    }

    private static string JsonEscape(string value)
    {
        return (value ?? "").Replace("\\", "\\\\").Replace("\"", "\\\"");
    }

    private static string JsonString(string json, string key)
    {
        Match match = Regex.Match(json, "\"" + Regex.Escape(key) + "\"\\s*:\\s*\"((?:\\\\.|[^\"])*)\"");
        return match.Success ? Regex.Unescape(match.Groups[1].Value) : "";
    }

    private static void OpenUrl(string url)
    {
        Process.Start(new ProcessStartInfo
        {
            FileName = url,
            UseShellExecute = true
        });
    }

    private async Task StartLoginFlow()
    {
        if (pollingLogin) return;
        try
        {
            pollingLogin = true;
            connectButton.Enabled = false;
            connectionLabel.Text = T("connecting");
            connectionLabel.ForeColor = Theme.Info;
            string deviceName = Environment.MachineName;
            string response = await ApiPost("/api/companion/device/start", "{\"deviceName\":\"" + JsonEscape(deviceName) + "\"}");
            deviceCode = JsonString(response, "code");
            deviceId = JsonString(response, "deviceId");
            string connectUrl = JsonString(response, "connectUrl");
            AddLogLine(T("openBrowserCode") + deviceCode);
            OpenUrl(connectUrl);
            loginPollTimer.Start();
        }
        catch (Exception ex)
        {
            pollingLogin = false;
            connectButton.Enabled = true;
            connectionLabel.Text = T("loginImpossible");
            connectionLabel.ForeColor = Theme.Warn;
            AddLogLine(T("loginFailed") + ex.Message);
        }
    }

    private async Task PollLoginFlow()
    {
        if (!pollingLogin || string.IsNullOrWhiteSpace(deviceCode) || string.IsNullOrWhiteSpace(deviceId)) return;
        try
        {
            string response = await ApiPost("/api/companion/device/poll", "{\"code\":\"" + JsonEscape(deviceCode) + "\",\"deviceId\":\"" + JsonEscape(deviceId) + "\"}");
            string status = JsonString(response, "status");
            if (status == "authorized")
            {
                loginPollTimer.Stop();
                pollingLogin = false;
                deviceToken = JsonString(response, "token");
                connectedName = JsonString(response, "userName");
                SaveSession();
                RefreshConnectionUi();
                AddLogLine(T("connectedAs") + connectedName);
            }
            else if (status == "expired")
            {
                loginPollTimer.Stop();
                pollingLogin = false;
                deviceCode = "";
                deviceId = "";
                RefreshConnectionUi();
                AddLogLine(T("expired"));
            }
        }
        catch (Exception ex)
        {
            AddLogLine(T("waitingAuth") + ex.Message);
        }
    }

    private void RefreshConnectionUi()
    {
        var theme = Theme;
        if (!string.IsNullOrWhiteSpace(deviceToken))
        {
            connectionLabel.Text = (languageCode == "en" ? "Connected: " : languageCode == "es" ? "Conectado: " : "Connecte : ") + (string.IsNullOrWhiteSpace(connectedName) ? "WZPRO" : connectedName);
            connectionLabel.ForeColor = theme.Success;
            connectButton.Text = T("reconnect");
            startButton.Enabled = true;
        }
        else
        {
            connectionLabel.Text = T("disconnected");
            connectionLabel.ForeColor = theme.Warn;
            connectButton.Text = T("connect");
            startButton.Enabled = false;
        }
    }

    private void StartCompanion()
    {
        if (companionProcess != null && !companionProcess.HasExited) return;
        if (string.IsNullOrWhiteSpace(deviceToken))
        {
            MessageBox.Show(T("connectFirst"), "WZPRO Companion");
            return;
        }

        int pollMs = Math.Max(3000, (int)pollBox.Value * 1000);
        if (!File.Exists(engineScript))
        {
            MessageBox.Show(T("engineMissing"), "WZPRO Companion");
            return;
        }

        statusLabel.Text = T("starting");
        statusLabel.ForeColor = Theme.Info;
        AddLogLine(T("startingFor") + site);

        var start = new ProcessStartInfo
        {
            FileName = nodePath,
            Arguments = Quote(engineScript) + " --site " + Quote(site) + " --token " + Quote(deviceToken) + " --poll_ms " + pollMs,
            WorkingDirectory = engineWorkingDirectory,
            UseShellExecute = false,
            RedirectStandardOutput = true,
            RedirectStandardError = true,
            CreateNoWindow = true
        };
        companionProcess = new Process { StartInfo = start, EnableRaisingEvents = true };
        companionProcess.OutputDataReceived += delegate(object sender, DataReceivedEventArgs e) { if (!string.IsNullOrWhiteSpace(e.Data)) pendingLines.Enqueue(e.Data); };
        companionProcess.ErrorDataReceived += delegate(object sender, DataReceivedEventArgs e) { if (!string.IsNullOrWhiteSpace(e.Data)) pendingLines.Enqueue(e.Data); };
        companionProcess.Exited += delegate { pendingLines.Enqueue(T("stopped")); };
        companionProcess.Start();
        companionProcess.BeginOutputReadLine();
        companionProcess.BeginErrorReadLine();
        SetRunningState(true);
    }

    private void StopCompanion()
    {
        if (companionProcess != null && !companionProcess.HasExited)
        {
            AddLogLine(T("stopping"));
            try
            {
                companionProcess.Kill();
                companionProcess.WaitForExit(2500);
            }
            catch (Exception ex)
            {
                AddLogLine(T("stopFailed") + ex.Message);
            }
        }
        SetRunningState(false);
    }

    private void SetRunningState(bool running)
    {
        var theme = Theme;
        startButton.Enabled = !running && !string.IsNullOrWhiteSpace(deviceToken);
        stopButton.Enabled = running;
        pollBox.Enabled = !running;
        connectButton.Enabled = !running && !pollingLogin;
        if (!running)
        {
            statusLabel.Text = T("stopped");
            statusLabel.ForeColor = theme.Muted;
            tray.Text = T("trayStopped");
        }
    }

    private void AddLogLine(string line)
    {
        var theme = Theme;
        if (string.IsNullOrWhiteSpace(line) || logBox == null) return;
        logBox.AppendText("[" + DateTime.Now.ToString("HH:mm:ss") + "] " + line + Environment.NewLine);
        if (line.Contains("Uploaded game"))
        {
            historyCount++;
            historyList.Items.Insert(0, T("gamePrefix") + historyCount + " - " + line);
        }
        if (line.Contains("Waiting for Call of Duty"))
        {
            statusLabel.Text = T("warzoneMissing");
            statusLabel.ForeColor = theme.Muted;
            tray.Text = T("trayWaitingWarzone");
        }
        else if (line.Contains("waiting for the game window"))
        {
            statusLabel.Text = T("warzoneFocus");
            statusLabel.ForeColor = theme.Warn;
            tray.Text = T("trayWaitingFocus");
        }
        else if (line.Contains("Watching active game window"))
        {
            statusLabel.Text = T("watching");
            statusLabel.ForeColor = theme.Info;
            tray.Text = T("trayWatching");
        }
        else if (line.Contains("Uploaded game"))
        {
            statusLabel.Text = T("gameImported");
            statusLabel.ForeColor = theme.Success;
            tray.ShowBalloonTip(3500, "WZPRO Companion", line, ToolTipIcon.Info);
        }
        else if (line.Contains("Companion waiting"))
        {
            statusLabel.Text = T("waiting");
            statusLabel.ForeColor = theme.Warn;
        }
    }

    private void HideToBackground()
    {
        WindowState = FormWindowState.Normal;
        ShowInTaskbar = false;
        Hide();
        tray.Visible = true;
        if (!minimizeNoticeShown)
        {
            tray.ShowBalloonTip(3000, T("minimizeTitle"), T("minimizeNotice"), ToolTipIcon.Info);
            minimizeNoticeShown = true;
        }
    }

    private void ShowFromBackground()
    {
        ShowInTaskbar = true;
        Show();
        WindowState = FormWindowState.Normal;
        Activate();
    }

    private DialogResult ShowCloseChoice()
    {
        var theme = Theme;
        using (var dialog = new Form())
        {
            dialog.Text = T("minimizeTitle");
            dialog.Size = new Size(460, 190);
            dialog.StartPosition = FormStartPosition.CenterParent;
            dialog.FormBorderStyle = FormBorderStyle.FixedDialog;
            dialog.MaximizeBox = false;
            dialog.MinimizeBox = false;
            dialog.BackColor = theme.Canvas;
            dialog.ForeColor = theme.Ink;
            dialog.Font = new Font("Consolas", 9);
            var message = Label(T("minimizeNotice"), 22, 24, 400, 42, 9, FontStyle.Bold, theme.Ink);
            var body = Label(T("minimizeBody"), 22, 64, 400, 38, 9, FontStyle.Regular, theme.Muted);
            dialog.Controls.Add(message);
            dialog.Controls.Add(body);
            var reduce = Button(T("reduce"), 156, 112, 116, 30, theme.Blue);
            StylePrimaryButton(reduce, theme);
            reduce.DialogResult = DialogResult.Cancel;
            dialog.Controls.Add(reduce);
            var quit = Button(T("quitDialog"), 282, 112, 140, 30, theme.SurfaceAlt);
            StyleSecondaryButton(quit, theme);
            quit.DialogResult = DialogResult.OK;
            dialog.Controls.Add(quit);
            dialog.AcceptButton = reduce;
            dialog.CancelButton = reduce;
            return dialog.ShowDialog(this);
        }
    }

    private static string Quote(string value)
    {
        if (string.IsNullOrEmpty(value)) return "\"\"";
        return "\"" + value.Replace("\\", "\\\\").Replace("\"", "\\\"") + "\"";
    }
}
