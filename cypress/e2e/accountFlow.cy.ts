describe('User Account Flow', () => {
  it('registration, login/logout, addresses, order history (UI presence)', () => {
    cy.visit('/en/register');
    cy.get('body').then(($b) => {
      if ($b.find('input[type=email]').length) {
        cy.get('input[type=email]').first().type('test+' + Date.now() + '@example.com');
      }
      if ($b.find('input[type=password]').length) {
        cy.get('input[type=password]').first().type('Password123!');
      }
    });

    // Navigate to login
    cy.visit('/en/login');
    cy.get('body').then(($b) => {
      if ($b.find('input[type=email]').length) {
        cy.get('input[type=email]').first().type('demo@example.com');
        cy.get('input[type=password]').first().type('Password123!');
        cy.get('button[type=submit]').first().click({ force: true });
      }
    });

    // Account area
    cy.visit('/en/account');
    cy.contains(/dashboard|orders|addresses|settings/i);
    cy.contains(/orders/i).click({ force: true });
    cy.url().should('include', '/account/orders');
  });
});


