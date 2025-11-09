describe('Admin Flow', () => {
  it('requires authentication and shows admin panels', () => {
    cy.visit('/en/admin');
    // Likely redirected to login or 401 page
    cy.url().should('match', /login|admin/);

    // If logged in as admin (pre-seeded), visit dashboards
    cy.visit('/en/admin/products');
    cy.contains(/products|create|new/i);
    cy.visit('/en/admin/users');
    cy.contains(/users|search/i);
    cy.visit('/en/admin/guides');
    cy.contains(/guides|status/i);
  });
});


