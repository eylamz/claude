'use client';

/**
 * Loads Google Fonts in a non-render-blocking way: link with media="print"
 * then switch to media="all" on load. Must be a Client Component so onLoad is allowed.
 */
export function GoogleFontsLinks() {
  return (
    <>
      <link
        href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap"
        rel="stylesheet"
        media="print"
        onLoad={(e) => {
          (e.target as HTMLLinkElement).media = 'all';
        }}
      />
      <link
        href="https://fonts.googleapis.com/css2?family=Assistant:wght@200;300;400;500;600;700;800&display=swap"
        rel="stylesheet"
        media="print"
        onLoad={(e) => {
          (e.target as HTMLLinkElement).media = 'all';
        }}
      />
    </>
  );
}
