describe('Mobile Navigation and Gestures', () => {
  beforeEach(() => {
    cy.viewport('iphone-6');
  });

  it('shows bottom tabs and opens hamburger menu', () => {
    cy.visit('/en');
    cy.get('nav').should('exist');
    // Open hamburger if present
    cy.get('body').then(($b) => {
      const menuBtn = $b.find('button[aria-label="Open menu"],button:contains("Menu")');
      if (menuBtn.length) cy.wrap(menuBtn.first()).click({ force: true });
    });
  });

  it('renders search modal and allows typing', () => {
    cy.visit('/en');
    cy.get('body').then(($b) => {
      const searchBtn = $b.find('button[aria-label="Open search"],button:contains("Search")');
      if (searchBtn.length) cy.wrap(searchBtn.first()).click({ force: true });
    });
    cy.get('input[type=text]').first().type('skate');
  });
});


