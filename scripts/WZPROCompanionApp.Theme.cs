using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Drawing.Text;
using System.IO;
using System.Net;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Reflection;
using System.Runtime.InteropServices;
using System.Text;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using System.Windows.Forms;

public sealed partial class WzproCompanionApp
{
    private void ApplyLanguage()
    {
        Text = "WZPRO Companion v" + AppVersion;
        titleLabel.Text = T("title");
        leadLabel.Text = T("lead");
        freeAccessButton.Text = T("freeAccess");
        premiumButton.Text = T("premiumAccess");
        trainingButton.Text = T("trainingAccess");
        if (optimisationButton != null) optimisationButton.Text = T("optimisationAccess");
        ApplySidebarIcons();
        if (restartButton != null) restartButton.Text = T("restartApp");
        if (compactButton != null) compactButton.Text = compactMode ? T("compactExit") : T("compactMode");
        if (supportButton != null) supportButton.Text = T("supportButton");
        UpdateSidebarStatuses();
        if (optimisationPageTitleLabel != null) optimisationPageTitleLabel.Text = T("optimisationPageTitle");
        if (optimisationPageDescLabel != null) optimisationPageDescLabel.Text = T("optimisationPageDesc");
        if (optimisationAllButton != null) optimisationAllButton.Text = T("optimisationAll");
        if (optimisationOverlayTitleLabel != null) optimisationOverlayTitleLabel.Text = T("optimisationOverlayTitle");
        if (optimisationOverlayDescLabel != null) optimisationOverlayDescLabel.Text = T("optimisationOverlayDesc");
        if (overlayToggleButton != null) overlayToggleButton.Text = T("optimisationOverlayBtn");
        applyingOverlayState = true;
        if (overlayGamesCheck != null) { overlayGamesCheck.Text = T("overlayToggleGames"); overlayGamesCheck.Checked = overlayShowGames; }
        if (overlayHighlightsCheck != null) { overlayHighlightsCheck.Text = T("overlayToggleHighlights"); overlayHighlightsCheck.Checked = overlayShowHighlights; }
        if (overlayMetaCheck != null) { overlayMetaCheck.Text = T("overlayToggleMeta"); overlayMetaCheck.Checked = overlayShowMeta; }
        if (overlayPerfCheck != null) { overlayPerfCheck.Text = T("overlayTogglePerf"); overlayPerfCheck.Checked = overlayShowPerf; }
        applyingOverlayState = false;
        UpdateOverlayStatus();
        if (overlayForm != null) RefreshOverlayActions();
        if (optimisationBoostTitleLabel != null) optimisationBoostTitleLabel.Text = T("optimisationBoostTitle");
        if (optimisationBoostDescLabel != null) optimisationBoostDescLabel.Text = T("optimisationBoostDesc");
        if (boostFreeRamCheck != null) { boostFreeRamCheck.Text = T("optimisationBoostFreeRam"); boostFreeRamCheck.Checked = boostFreeRam; }
        if (boostPriorityCheck != null) { boostPriorityCheck.Text = T("optimisationBoostPriority"); boostPriorityCheck.Checked = boostPriority; }
        if (boostVisualCheck != null) { boostVisualCheck.Text = T("optimisationBoostVisual"); boostVisualCheck.Checked = boostVisualEffects; }
        if (boostFreeRamTitleLabel != null) boostFreeRamTitleLabel.Text = T("optimisationBoostFreeRam");
        if (boostFreeRamDescLabel != null) boostFreeRamDescLabel.Text = T("optimisationBoostFreeRamDesc");
        if (boostPriorityTitleLabel != null) boostPriorityTitleLabel.Text = T("optimisationBoostPriority");
        if (boostPriorityDescLabel != null) boostPriorityDescLabel.Text = T("optimisationBoostPriorityDesc");
        if (boostVisualTitleLabel != null) boostVisualTitleLabel.Text = T("optimisationBoostVisual");
        if (boostVisualDescLabel != null) boostVisualDescLabel.Text = T("optimisationBoostVisualDesc");
        Label tweaksTitle = NamedLabel(optimisationTweaksPanel, "tweaksTitle");
        if (tweaksTitle != null) tweaksTitle.Text = T("tweaksSectionTitle");
        Label tweaksWarning = NamedLabel(optimisationTweaksPanel, "tweaksWarning");
        if (tweaksWarning != null) tweaksWarning.Text = T("tweaksWarning");
        foreach (string id in TweakIds) UpdateTweakButton(id);
        UpdateGameBoostStatus();
        freePageTitleLabel.Text = T("freePageTitle");
        freePageDescLabel.Text = T("freePageDesc");
        if (settingsPageTitleLabel != null) settingsPageTitleLabel.Text = T("settingsPageTitle");
        if (settingsPageDescLabel != null) settingsPageDescLabel.Text = T("settingsPageDesc");
        if (settingsActivisionLabel != null) settingsActivisionLabel.Text = T("settingsActivisionLabel");
        if (settingsPictureLabel != null) settingsPictureLabel.Text = T("settingsPictureLabel");
        if (settingsChoosePictureButton != null) settingsChoosePictureButton.Text = T("settingsChoosePicture");
        if (settingsSaveButton != null) settingsSaveButton.Text = T("settingsSave");
        if (freeStatsTitleLabel != null) freeStatsTitleLabel.Text = T("freeStatsTitle");
        if (freeStatsSummaryLabel != null && string.IsNullOrWhiteSpace(freeStatsSummaryLabel.Text)) freeStatsSummaryLabel.Text = T("freeStatsEmpty");
        premiumPageTitleLabel.Text = T("premiumPageTitle");
        premiumPageDescLabel.Text = T("premiumPageDesc");
        if (profileRestartItem != null) profileRestartItem.Text = T("restartApp");
        if (profileCompactItem != null) profileCompactItem.Text = compactMode ? T("compactExit") : T("compactMode");
        if (profileSupportItem != null) profileSupportItem.Text = T("supportButton");
        profileSettingsItem.Text = T("goSettings");
        profileLogoutItem.Text = T("logout");
        welcomeKickerLabel.Text = T("welcomeKicker");
        welcomeTitleLabel.Text = T("welcomeTitle");
        welcomeSubtitleLabel.Text = T("welcomeSubtitle");
        welcomeStatsLabel.Text = T("welcomeStats");
        welcomeLoginTitleLabel.Text = T("welcomeLoginTitle");
        welcomeConnectButton.Text = T("welcomeConnect");
        welcomeSiteButton.Text = T("welcomeSite");
        welcomeLoginStatusLabel.Text = pollingLogin ? T("connecting") : T("welcomeStatus");
        RefreshProfileUi();
        verifyLabel.Text = T("verifyEvery");
        secondsLabel.Text = T("seconds");
        if (monitorLabel != null) monitorLabel.Text = T("captureMonitor");
        PopulateMonitorBox();
        startButton.Text = T("start");
        stopButton.Text = T("stop");
        hintLabel.Text = T("hint");
        highlightsTitleLabel.Text = T("highlightsTitle");
        highlightsToggle.Text = "";
        ApplyManualReplayHint();
        highlightsStatusLabel.Text = highlightsProEnabled ? T("highlightsStatusOn") : T("highlightsStatusOff");
        clipsFolderTitleLabel.Text = T("clipsFolderTitle");
        clipsFolderButton.Text = T("clipsFolderChoose");
        clipsOpenFolderButton.Text = T("clipsFolderOpen");
        premiumCheckoutHintLabel.Text = T("premiumCheckoutHint");
        premiumCheckoutButton.Text = T("premiumCheckout");
        premiumRefreshButton.Text = T("premiumRefresh");
        if (statsButton != null) statsButton.Text = T("statsButton");
        if (gameBarButton != null) gameBarButton.Text = T("gameBar");
        if (overlayButton != null) overlayButton.Text = T("overlayButton");
        if (musicButton != null) musicButton.Text = T("musicButton");
        RefreshMusicUi();
        RefreshAudioUi();
        PopulateClipCombos();
        RefreshPremiumAccessUi();
        RefreshClipsFolderUi();
        RefreshTrainingUi();
        importsLabel.Text = T("imports");
        if (importAddButton != null) importAddButton.Text = T("importAdd");
        if (importOpenButton != null) importOpenButton.Text = T("importOpen");
        journalLabel.Text = T("journal");
        themeButton.Text = themeMode == "light" ? T("themeDark") : T("themeLight");

        updatingLanguageUi = true;
        languageBox.SelectedItem = languageCode.ToUpperInvariant();
        welcomeLanguageBox.SelectedItem = languageCode.ToUpperInvariant();
        updatingLanguageUi = false;

        if (trayShowItem != null) trayShowItem.Text = T("show");
        if (trayStartItem != null) trayStartItem.Text = T("start");
        if (trayStopItem != null) trayStopItem.Text = T("stop");
        if (trayQuitItem != null) trayQuitItem.Text = T("quit");
        if (tray != null && !IsRunning) tray.Text = T("trayStopped");
        ShowPage(activePage);
    }

    private void ApplyTheme()
    {
        var theme = Theme;
        BackColor = theme.Canvas;
        ForeColor = theme.Ink;
        if (sidebarPanel != null) sidebarPanel.BackColor = theme.SurfaceAlt;
        if (mainPanel != null) mainPanel.BackColor = theme.Canvas;
        if (topBarPanel != null) topBarPanel.BackColor = theme.Canvas;
        if (searchBoxLabel != null)
        {
            searchBoxLabel.BackColor = theme.Surface;
            searchBoxLabel.ForeColor = theme.Muted;
        }
        if (welcomePanel != null) welcomePanel.BackColor = theme.Canvas;
        if (welcomeLoginPanel != null) welcomeLoginPanel.BackColor = theme.Surface;
        if (freeInfoCard != null) freeInfoCard.BackColor = theme.Canvas;
        if (settingsInfoCard != null) settingsInfoCard.BackColor = theme.Canvas;
        if (settingsProfileCard != null) settingsProfileCard.BackColor = theme.Surface;
        if (settingsPictureCard != null) settingsPictureCard.BackColor = theme.Surface;
        if (optimisationInfoCard != null) optimisationInfoCard.BackColor = theme.Canvas;
        if (optimisationOverlayCard != null) optimisationOverlayCard.BackColor = theme.Surface;
        if (optimisationBoostCard != null) optimisationBoostCard.BackColor = theme.Surface;
        if (boostFreeRamCard != null) boostFreeRamCard.BackColor = theme.Surface;
        if (boostPriorityCard != null) boostPriorityCard.BackColor = theme.Surface;
        if (boostVisualCard != null) boostVisualCard.BackColor = theme.Surface;
        if (optimisationTweaksPanel != null) optimisationTweaksPanel.BackColor = theme.Canvas;
        foreach (var tc in tweakCards.Values) if (tc != null) tc.BackColor = theme.Surface;
        if (freeConnectionCard != null) freeConnectionCard.BackColor = theme.Surface;
        if (freeControlsCard != null) freeControlsCard.BackColor = theme.Surface;
        if (freeStatsCard != null) freeStatsCard.BackColor = theme.Surface;
        if (premiumInfoCard != null) premiumInfoCard.BackColor = theme.Canvas;
        if (premiumHighlightsCard != null) premiumHighlightsCard.BackColor = theme.Surface;
        if (premiumClipsCard != null) premiumClipsCard.BackColor = theme.Surface;
        if (premiumAccessCard != null) premiumAccessCard.BackColor = theme.Surface;
        if (premiumAdvancedCard != null) premiumAdvancedCard.BackColor = theme.Surface;
        if (trainingInfoCard != null) trainingInfoCard.BackColor = theme.Canvas;
        if (trainingReviewCard != null) trainingReviewCard.BackColor = theme.Surface;
        if (trainingReadinessCard != null) trainingReadinessCard.BackColor = theme.Surface;
        if (trainingHeatmapCard != null) trainingHeatmapCard.BackColor = theme.Surface;
        if (trainingDeathCard != null) trainingDeathCard.BackColor = theme.Surface;
        if (trainingObjectiveCard != null) trainingObjectiveCard.BackColor = theme.Surface;
        if (trainingWarmupCard != null) trainingWarmupCard.BackColor = theme.Surface;
        if (trainingVodCard != null) trainingVodCard.BackColor = theme.Surface;
        if (trainingHebdoCard != null) trainingHebdoCard.BackColor = theme.Surface;
        if (trainingQuizCard != null) trainingQuizCard.BackColor = theme.Surface;
        if (trainingRoutineCard != null) trainingRoutineCard.BackColor = theme.Surface;
        if (profilePanel != null) profilePanel.BackColor = theme.SurfaceAlt;
        if (profileNameLabel != null) profileNameLabel.ForeColor = theme.Ink;
        if (versionLabel != null) versionLabel.ForeColor = theme.Muted;
        if (profilePictureBox != null) profilePictureBox.BackColor = Color.Transparent;
        if (profileMenu != null)
        {
            profileMenu.BackColor = theme.SurfaceAlt;
            profileMenu.ForeColor = theme.Ink;
        }
        RefreshBrandLogo();

        ApplyThemeToControls(Controls, theme);

        if (sidebarPanel != null) sidebarPanel.BackColor = theme.SurfaceAlt;
        if (mainPanel != null) mainPanel.BackColor = theme.Canvas;
        if (topBarPanel != null) topBarPanel.BackColor = theme.Canvas;
        if (searchBoxLabel != null)
        {
            searchBoxLabel.BackColor = theme.Surface;
            searchBoxLabel.ForeColor = theme.Muted;
        }
        if (welcomePanel != null) welcomePanel.BackColor = theme.Canvas;
        if (welcomeLoginPanel != null) welcomeLoginPanel.BackColor = theme.Surface;
        if (freeInfoCard != null) freeInfoCard.BackColor = theme.Canvas;
        if (settingsInfoCard != null) settingsInfoCard.BackColor = theme.Canvas;
        if (settingsProfileCard != null) settingsProfileCard.BackColor = theme.Surface;
        if (settingsPictureCard != null) settingsPictureCard.BackColor = theme.Surface;
        if (optimisationInfoCard != null) optimisationInfoCard.BackColor = theme.Canvas;
        if (optimisationOverlayCard != null) optimisationOverlayCard.BackColor = theme.Surface;
        if (optimisationBoostCard != null) optimisationBoostCard.BackColor = theme.Surface;
        if (boostFreeRamCard != null) boostFreeRamCard.BackColor = theme.Surface;
        if (boostPriorityCard != null) boostPriorityCard.BackColor = theme.Surface;
        if (boostVisualCard != null) boostVisualCard.BackColor = theme.Surface;
        if (optimisationTweaksPanel != null) optimisationTweaksPanel.BackColor = theme.Canvas;
        foreach (var tc in tweakCards.Values) if (tc != null) tc.BackColor = theme.Surface;
        if (freeConnectionCard != null) freeConnectionCard.BackColor = theme.Surface;
        if (freeControlsCard != null) freeControlsCard.BackColor = theme.Surface;
        if (freeStatsCard != null) freeStatsCard.BackColor = theme.Surface;
        if (premiumInfoCard != null) premiumInfoCard.BackColor = theme.Canvas;
        if (premiumHighlightsCard != null) premiumHighlightsCard.BackColor = theme.Surface;
        if (premiumClipsCard != null) premiumClipsCard.BackColor = theme.Surface;
        if (premiumAccessCard != null) premiumAccessCard.BackColor = theme.Surface;
        if (premiumAdvancedCard != null) premiumAdvancedCard.BackColor = theme.Surface;
        if (trainingInfoCard != null) trainingInfoCard.BackColor = theme.Canvas;
        if (trainingReviewCard != null) trainingReviewCard.BackColor = theme.Surface;
        if (trainingReadinessCard != null) trainingReadinessCard.BackColor = theme.Surface;
        if (trainingHeatmapCard != null) trainingHeatmapCard.BackColor = theme.Surface;
        if (trainingDeathCard != null) trainingDeathCard.BackColor = theme.Surface;
        if (trainingObjectiveCard != null) trainingObjectiveCard.BackColor = theme.Surface;
        if (trainingWarmupCard != null) trainingWarmupCard.BackColor = theme.Surface;
        if (trainingVodCard != null) trainingVodCard.BackColor = theme.Surface;
        if (trainingHebdoCard != null) trainingHebdoCard.BackColor = theme.Surface;
        if (trainingQuizCard != null) trainingQuizCard.BackColor = theme.Surface;
        if (trainingRoutineCard != null) trainingRoutineCard.BackColor = theme.Surface;
        if (profilePanel != null) profilePanel.BackColor = theme.SurfaceAlt;
        if (profileNameLabel != null) profileNameLabel.ForeColor = theme.Ink;
        if (versionLabel != null) versionLabel.ForeColor = theme.Muted;
        if (profilePictureBox != null) profilePictureBox.BackColor = Color.Transparent;
        titleLabel.ForeColor = theme.Blue;
        welcomeKickerLabel.ForeColor = theme.Blue;
        welcomeTitleLabel.ForeColor = theme.Ink;
        welcomeSubtitleLabel.ForeColor = theme.Muted;
        welcomeStatsLabel.ForeColor = theme.Ink;
        welcomeLoginTitleLabel.ForeColor = theme.Ink;
        welcomeLoginStatusLabel.ForeColor = theme.Muted;
        leadLabel.ForeColor = theme.Muted;
        freePageTitleLabel.ForeColor = theme.Ink;
        freePageDescLabel.ForeColor = theme.Muted;
        if (freeStatsTitleLabel != null) freeStatsTitleLabel.ForeColor = theme.Blue;
        if (freeStatsSummaryLabel != null) freeStatsSummaryLabel.ForeColor = theme.Ink;
        if (freeStatsDetailLabel != null) freeStatsDetailLabel.ForeColor = theme.Muted;
        if (settingsPageTitleLabel != null) settingsPageTitleLabel.ForeColor = theme.Ink;
        if (settingsPageDescLabel != null) settingsPageDescLabel.ForeColor = theme.Muted;
        if (settingsActivisionLabel != null) settingsActivisionLabel.ForeColor = theme.Blue;
        if (settingsPictureLabel != null) settingsPictureLabel.ForeColor = theme.Blue;
        if (settingsStatusLabel != null) settingsStatusLabel.ForeColor = theme.Muted;
        if (settingsPicturePreviewBox != null) settingsPicturePreviewBox.BackColor = Color.Transparent;
        if (boostFreeRamTitleLabel != null) boostFreeRamTitleLabel.ForeColor = theme.Ink;
        if (boostPriorityTitleLabel != null) boostPriorityTitleLabel.ForeColor = theme.Ink;
        if (boostVisualTitleLabel != null) boostVisualTitleLabel.ForeColor = theme.Ink;
        if (boostFreeRamDescLabel != null) boostFreeRamDescLabel.ForeColor = theme.Muted;
        if (boostPriorityDescLabel != null) boostPriorityDescLabel.ForeColor = theme.Muted;
        if (boostVisualDescLabel != null) boostVisualDescLabel.ForeColor = theme.Muted;
        premiumPageTitleLabel.ForeColor = theme.Ink;
        premiumPageDescLabel.ForeColor = theme.Muted;
        hintLabel.ForeColor = theme.Muted;
        verifyLabel.ForeColor = theme.Ink;
        secondsLabel.ForeColor = theme.Ink;
        highlightsTitleLabel.ForeColor = theme.Blue;
        highlightsDescLabel.ForeColor = theme.Muted;
        highlightsStatusLabel.ForeColor = highlightsProEnabled ? theme.Warn : theme.Muted;
        clipsFolderTitleLabel.ForeColor = theme.Blue;
        clipsFolderValueLabel.ForeColor = theme.Muted;
        premiumCheckoutHintLabel.ForeColor = theme.Muted;
        premiumAccessStatusLabel.ForeColor = premiumAccessActive ? theme.Success : theme.Muted;
        importsLabel.ForeColor = theme.Blue;
        journalLabel.ForeColor = theme.Blue;
        RefreshTrainingUi();

        StylePrimaryButton(connectButton, theme);
        StylePrimaryButton(welcomeConnectButton, theme);
        StyleSecondaryButton(welcomeSiteButton, theme);
        StylePrimaryButton(startButton, theme);
        StyleSecondaryButton(stopButton, theme);
        StylePrimaryButton(importAddButton, theme);
        StyleSecondaryButton(importOpenButton, theme);
        StylePrimaryButton(settingsSaveButton, theme);
        StyleSecondaryButton(settingsChoosePictureButton, theme);
        // overlayToggleButton + gameBoostButton are rendered as switches via SetOptionButton.
        StylePrimaryButton(optimisationAllButton, theme);
        RefreshOptimisationOptionsUi();
        StylePrimaryButton(clipsFolderButton, theme);
        StyleSecondaryButton(clipsOpenFolderButton, theme);
        StylePrimaryButton(premiumCheckoutButton, theme);
        StyleSecondaryButton(premiumRefreshButton, theme);
        StyleSecondaryButton(themeButton, theme);
        StyleSecondaryButton(minimizeButton, theme);
        StyleSecondaryButton(closeButton, theme);
        StyleSecondaryButton(restartButton, theme);
        StyleSecondaryButton(compactButton, theme);
        StyleSecondaryButton(supportButton, theme);
        StyleComboBox(languageBox, theme);
        StyleCheckBox(highlightsToggle, theme);
        StylePageButtons(theme);
        UpdateGameBoostStatus(); // re-assert the active/inactive boost colour after the primary-button reset
        RefreshTrainingUi();
        RefreshProfileUi();
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
                control.Cursor = Cursors.Hand;
                control.BackColor = theme.SurfaceAlt;
                control.ForeColor = theme.Ink;
            }
            else if (control is CheckBox)
            {
                control.BackColor = Color.Transparent;
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
        button.FlatAppearance.BorderSize = 0;
        button.FlatAppearance.BorderColor = theme.Blue;
        button.FlatAppearance.MouseOverBackColor = theme.Blue;
        button.FlatAppearance.MouseDownBackColor = theme.Blue;
    }

    private void StyleSecondaryButton(Button button, WzTheme theme)
    {
        if (button == null) return;
        button.BackColor = theme.SurfaceAlt;
        button.ForeColor = theme.Ink;
        button.FlatAppearance.BorderSize = 0;
        button.FlatAppearance.BorderColor = theme.Line;
        button.FlatAppearance.MouseOverBackColor = theme.Surface;
        button.FlatAppearance.MouseDownBackColor = theme.SurfaceAlt;
    }

    private void StylePageButtons(WzTheme theme)
    {
        StylePageButton(freeAccessButton, activePage == "free", theme);
        StylePageButton(premiumButton, activePage == "premium", theme);
        StylePageButton(trainingButton, activePage == "training", theme);
        StylePageButton(optimisationButton, activePage == "optimisation", theme);
        StylePageButton(settingsButton, activePage == "settings", theme);
    }

    private void StylePageButton(Button button, bool active, WzTheme theme)
    {
        if (button == null) return;
        button.BackColor = active ? theme.Surface : theme.SurfaceAlt;
        button.ForeColor = active ? theme.Blue : theme.Ink;
        button.FlatAppearance.BorderSize = 0;
        button.FlatAppearance.BorderColor = active ? theme.Blue : theme.Line;
        button.FlatAppearance.MouseOverBackColor = theme.Surface;
        button.FlatAppearance.MouseDownBackColor = theme.SurfaceAlt;
    }

    private void StyleComboBox(ComboBox comboBox, WzTheme theme)
    {
        if (comboBox == null) return;
        comboBox.BackColor = theme.SurfaceAlt;
        comboBox.ForeColor = theme.Ink;
    }

    private void StyleCheckBox(CheckBox checkBox, WzTheme theme)
    {
        if (checkBox == null) return;
        checkBox.BackColor = Color.Transparent;
        checkBox.ForeColor = theme.Ink;
        checkBox.FlatAppearance.BorderColor = highlightsProEnabled ? theme.Warn : theme.Line;
        checkBox.FlatAppearance.CheckedBackColor = theme.SurfaceAlt;
        checkBox.FlatAppearance.MouseOverBackColor = theme.SurfaceAlt;
    }
}
