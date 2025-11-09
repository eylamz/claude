import '@testing-library/jest-dom';
import 'jest-axe/extend-expect';

// MSW - Node server for unit tests
import { server } from './test/msw/server';

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());


