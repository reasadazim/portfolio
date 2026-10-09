export default function Footer() {
  return (
    <footer className="site-footer flex items-center justify-between gap-[20px]">
      <a className="wordmark" href="#top">
        reasad<span>●</span>
      </a>
      <p>
        © <span data-current-year>{new Date().getFullYear()}</span> Reasad Azim
      </p>
      <a className="back-to-top" href="#top">
        Back to top <span aria-hidden="true">↑</span>
      </a>
    </footer>
  );
}
