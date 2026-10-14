import './globals.css';
export const metadata = { title: 'Movie Club' };
export default function L({ children }) {
  return (
    <html lang="en">
      <body>
        <header className="marquee">
          <div className="awning" />
          <div className="dots"><i /><i /><i /></div>
          <h1>MOVIE CLUB</h1>
          <p>Pick · Rank · Watch</p>
        </header>
        {children}
      </body>
    </html>
  );
}
