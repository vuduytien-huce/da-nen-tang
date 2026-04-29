import { faker } from "@faker-js/faker";
import { act } from "@testing-library/react-native";
import { supabase } from "../api/supabase";
import { useAuthStore } from "../store/useAuthStore";

beforeEach(() => {
  useAuthStore.setState({
    session: null,
    profile: null,
    loading: false,
    initialized: false,
  });
  jest.clearAllMocks();
});

describe("useAuthStore", () => {
  it("starts with empty auth state", () => {
    const state = useAuthStore.getState();

    expect(state.session).toBeNull();
    expect(state.profile).toBeNull();
    expect(state.loading).toBe(false);
    expect(state.initialized).toBe(false);
  });

  it("setSession(null) clears auth state and marks initialized", async () => {
    await act(async () => {
      await useAuthStore.getState().setSession(null);
    });

    const state = useAuthStore.getState();
    expect(state.session).toBeNull();
    expect(state.profile).toBeNull();
    expect(state.loading).toBe(false);
    expect(state.initialized).toBe(true);
  });

  it("setSession(session) fetches and stores profile", async () => {
    const userId = faker.string.uuid();
    const fakeProfile = {
      id: userId,
      full_name: faker.person.fullName(),
      role: "MEMBER",
    };

    const singleMock = jest
      .fn()
      .mockResolvedValue({ data: fakeProfile, error: null });
    const eqMock = jest.fn().mockReturnValue({ single: singleMock });
    const selectMock = jest.fn().mockReturnValue({ eq: eqMock });
    (supabase.from as jest.Mock).mockReturnValue({ select: selectMock });

    const fakeSession = { user: { id: userId } } as any;

    await act(async () => {
      await useAuthStore.getState().setSession(fakeSession);
    });

    const state = useAuthStore.getState();
    expect(state.session).toEqual(fakeSession);
    expect(state.profile).toEqual({
      id: userId,
      fullName: fakeProfile.full_name,
      role: "MEMBER",
    });
    expect(state.loading).toBe(false);
    expect(state.initialized).toBe(true);
  });

  it("setSession(session) keeps deterministic state when profile row is missing", async () => {
    const userId = faker.string.uuid();

    const singleMock = jest
      .fn()
      .mockResolvedValue({
        data: null,
        error: { code: "PGRST116", message: "Results contain 0 rows" },
      });
    const eqMock = jest.fn().mockReturnValue({ single: singleMock });
    const selectMock = jest.fn().mockReturnValue({ eq: eqMock });
    (supabase.from as jest.Mock).mockReturnValue({ select: selectMock });

    const fakeSession = { user: { id: userId } } as any;

    await act(async () => {
      await useAuthStore.getState().setSession(fakeSession);
    });

    const state = useAuthStore.getState();
    expect(state.session).toEqual(fakeSession);
    expect(state.profile).toBeNull();
    expect(state.loading).toBe(false);
    expect(state.initialized).toBe(true);
  });

  it("setSession(session) does not break when profile query returns hard error", async () => {
    const userId = faker.string.uuid();

    const singleMock = jest
      .fn()
      .mockResolvedValue({
        data: null,
        error: { code: "XX000", message: "Database unavailable" },
      });
    const eqMock = jest.fn().mockReturnValue({ single: singleMock });
    const selectMock = jest.fn().mockReturnValue({ eq: eqMock });
    (supabase.from as jest.Mock).mockReturnValue({ select: selectMock });

    const fakeSession = { user: { id: userId } } as any;

    await act(async () => {
      await useAuthStore.getState().setSession(fakeSession);
    });

    const state = useAuthStore.getState();
    expect(state.session).toEqual(fakeSession);
    expect(state.profile).toBeNull();
    expect(state.loading).toBe(false);
    expect(state.initialized).toBe(true);
  });

  it("forceInitialize marks store initialized once", () => {
    act(() => {
      useAuthStore.getState().forceInitialize();
    });

    const state = useAuthStore.getState();
    expect(state.initialized).toBe(true);
    expect(state.loading).toBe(false);
  });

  it("logout calls supabase signOut and clears auth state", async () => {
    useAuthStore.setState({
      session: { user: { id: faker.string.uuid() } } as any,
      profile: {
        id: faker.string.uuid(),
        fullName: faker.person.fullName(),
        role: "LIBRARIAN",
      },
      loading: false,
      initialized: true,
    });

    await act(async () => {
      await useAuthStore.getState().logout();
    });

    expect(supabase.auth.signOut).toHaveBeenCalledTimes(1);
    const state = useAuthStore.getState();
    expect(state.session).toBeNull();
    expect(state.profile).toBeNull();
    expect(state.loading).toBe(false);
    expect(state.initialized).toBe(true);
  });
});
