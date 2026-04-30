import { Sparkles } from "lucide-react";
import { useTranslation } from "@nss/proposal-i18n";
import { SupportedLanguage, ThemeMode } from "../types/proposal";

interface HeaderProps {
  language: SupportedLanguage;
  themeMode: ThemeMode;
  onLanguageChange: (language: SupportedLanguage) => void;
  onThemeModeChange: (themeMode: ThemeMode) => void;
}

const Header = ({
  language,
  themeMode,
  onLanguageChange,
  onThemeModeChange
}: HeaderProps) => {
  const { t } = useTranslation();

  return (
    <header className="app-header reveal">
      <div className="glass-card header-shell">
        <div className="header-top-row">
          <div className="brand-row">
            <div className="brand-icon">
              <Sparkles size={24} color="white" />
            </div>
            <h2 className="brand-name">{t("app.brand")}</h2>
          </div>

          <div className="preference-row">
            <label className="pref-control">
              <span>{t("label.language")}</span>
              <select
                className="input-field pref-select"
                value={language}
                onChange={(event) =>
                  onLanguageChange(event.target.value as SupportedLanguage)
                }
              >
                <option value="en">English</option>
                <option value="es">Espanol</option>
                <option value="it">Italiano</option>
              </select>
            </label>

            <label className="pref-control">
              <span>{t("label.theme")}</span>
              <select
                className="input-field pref-select"
                value={themeMode}
                onChange={(event) => onThemeModeChange(event.target.value as ThemeMode)}
              >
                <option value="system">{t("label.themeSystem")}</option>
                <option value="dark">{t("label.themeDark")}</option>
                <option value="light">{t("label.themeLight")}</option>
              </select>
            </label>
          </div>
        </div>

        <div className="hero-copy">
          <h1 className="app-title">{t("app.title")}</h1>
          <p className="app-subtitle">{t("app.subtitle")}</p>
        </div>
      </div>
    </header>
  );
};

export default Header;

