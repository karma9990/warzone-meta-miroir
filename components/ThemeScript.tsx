export default function ThemeScript({ nonce }: { nonce?: string }) {
  const script = `
(() => {
  try {
    const storageKey = "wzpro-theme";
    const savedTheme = window.localStorage.getItem(storageKey);
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const theme = savedTheme === "light" || savedTheme === "dark" ? savedTheme : (prefersDark ? "dark" : "light");
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
  } catch {
    document.documentElement.dataset.theme = "light";
    document.documentElement.style.colorScheme = "light";
  }
})();
`;

  return <script nonce={nonce} dangerouslySetInnerHTML={{ __html: script }} />;
}
