import packageJson from '../../package.json';

const GITHUB_REPO_URL = 'https://github.com/dodgerbluee/trajectory';
const APP_NAME = 'Trajectory';
const version = (import.meta.env?.VITE_APP_VERSION as string) || packageJson.version;

function VersionFooter() {
  return (
    <footer className="version-footer" role="contentinfo">
      <a
        href={GITHUB_REPO_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="version-footer-link"
        aria-label="View repository on GitHub"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="lucide lucide-github"
          aria-hidden="true"
        >
          <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
          <path d="M9 18c-4.51 2-5-2-7-2" />
        </svg>
        <span>GitHub</span>
      </a>
      <span className="version-footer-separator" aria-hidden="true">
        |
      </span>
      <span
        className="version-footer-link version-footer-text"
        aria-label={`${APP_NAME} v${version}`}
      >
        <span>{APP_NAME}</span>
        <span className="version-footer-version"> v{version}</span>
      </span>
    </footer>
  );
}

export default VersionFooter;
