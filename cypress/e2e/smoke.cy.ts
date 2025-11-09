describe('Smoke', () => {
  it('loads homepage', () => {
    cy.visit('/');
    cy.contains('ENBOSS').should('exist');
  });
});



