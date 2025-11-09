// Basic next-auth useSession mock helper
export function mockUseSession(data: any = null, status: 'authenticated' | 'unauthenticated' | 'loading' = 'unauthenticated') {
  jest.mock('next-auth/react', () => ({
    __esModule: true,
    ...jest.requireActual('next-auth/react'),
    useSession: () => ({ data, status }),
  }));
}



