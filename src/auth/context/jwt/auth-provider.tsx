'use client';

import axios, { endpoints } from 'src/utils/axios';
import { useMemo, useEffect, useReducer, useCallback } from 'react';

import { AuthContext } from './auth-context';
import { setAccessTokenToLocalStorage, isValidToken } from './utils';
import { type AuthUserType, type ActionMapType, type AuthStateType } from '../../types';

// store
import useUserData from '@/src/store/useUserData';

// ----------------------------------------------------------------------

// NOTE:
// We only build demo at basic level.
// Customer will need to do some extra handling yourself if you want to extend the logic and other features...

// ----------------------------------------------------------------------

enum Types {
  INITIAL = 'INITIAL',
  LOGIN = 'LOGIN',
  REGISTER = 'REGISTER',
  LOGOUT = 'LOGOUT',
}

interface Payload {
  [Types.INITIAL]: {
    user: AuthUserType;
  };
  [Types.LOGIN]: {
    user: AuthUserType;
  };
  [Types.REGISTER]: {
    user: AuthUserType;
  };
  [Types.LOGOUT]: undefined;
}

type ActionsType = ActionMapType<Payload>[keyof ActionMapType<Payload>];

// ----------------------------------------------------------------------

const initialState: AuthStateType = {
  user: null,
  loading: true,
};

const reducer = (state: AuthStateType, action: ActionsType) => {
  if (action.type === Types.INITIAL) {
    return {
      loading: false,
      user: action.payload.user,
    };
  }
  if (action.type === Types.LOGIN) {
    return {
      ...state,
      user: action.payload.user,
    };
  }
  if (action.type === Types.REGISTER) {
    return {
      ...state,
      user: action.payload.user,
    };
  }
  if (action.type === Types.LOGOUT) {
    return {
      ...state,
      user: null,
    };
  }
  return state;
};

// ----------------------------------------------------------------------

const STORAGE_KEY = 'accessToken';

interface Props {
  children: React.ReactNode;
}

export function AuthProvider({ children }: Props) {
  const [state, dispatch] = useReducer(reducer, initialState);

  const setUserData = useUserData(state => state.updateUser)

  const initialize = useCallback(async () => {
    try {
      const accessToken = localStorage.getItem(STORAGE_KEY);

      if (accessToken && isValidToken(accessToken)) {
        setAccessTokenToLocalStorage(accessToken);

        const res = await axios.get(endpoints.auth.me);
        const { user } = res.data;
        setUserData(user)

        dispatch({
          type: Types.INITIAL,
          payload: {
            user: {
              ...user,
              accessToken,
            },
          },
        });
      } else {
        dispatch({
          type: Types.INITIAL,
          payload: {
            user: null,
          },
        });
      }
    } catch (error) {
      console.error(error);
      dispatch({
        type: Types.INITIAL,
        payload: {
          user: null,
        },
      });
    }
  }, []);

  useEffect(() => {
    initialize();
  }, [initialize]);

  // LOGIN
  // ME: Change email to username beacause my backend need username for login
  // ME: using accessToken for setSession and using refreshToken for dispatch
  const login = useCallback(
    async (username: string, password: string) => {
      const data = {
        username,
        password,
      };

      const res = await axios.post(endpoints.auth.login, data);
      const { accessToken, refreshToken, user } = res.data;

      console.log('accessToken', res.data);

      setAccessTokenToLocalStorage(accessToken);

      dispatch({
        type: Types.LOGIN,
        payload: {
          user: {
            ...user,
            // refreshToken,
            accessToken,
          },
        },
      });

      initialize();
    },
    [initialize]
  );

  // REGISTER
  // ME: Change email to username beacause my backend need username for login
  // ME: using accessToken for setSession and using refreshToken for dispatch

  const register = useCallback(
    async (username: string, password: string, firstName: string, lastName: string) => {
      const data = {
        username,
        password,
        firstName,
        lastName,
      };

      const res = await axios.post(endpoints.auth.register, data);

      const { accessToken, refreshToken, user } = res.data;

      sessionStorage.setItem(STORAGE_KEY, accessToken);

      dispatch({
        type: Types.REGISTER,
        payload: {
          user: {
            ...user,
            // refreshToken,
            accessToken,
          },
        },
      });
      initialize();
    },
    [initialize]
  );

  // LOGOUT
  const logout = useCallback(async () => {
    setAccessTokenToLocalStorage(null);
    dispatch({
      type: Types.LOGOUT,
    });
  }, []);

  // FORGOT-PASSWORD
  const forgotPassword = useCallback(
    async (email: string) => {
      const data = {
        email,
      };

      const res = await axios.post(endpoints.auth.passwordReset, data);
      return res.data;
    },
    [initialize]
  );

  // PASSWORD-RESET-CHANGE
  const passwordResetChange = useCallback(
    async (password: string, token: string) => {
      const data = {
        password,
        token,
      };

      const res = await axios.post(endpoints.auth.passwordResetChange, data);
      return res.data;
    },
    [initialize]
  );

  // ----------------------------------------------------------------------

  const checkAuthenticated = state.user ? 'authenticated' : 'unauthenticated';

  const status = state.loading ? 'loading' : checkAuthenticated;

  const memoizedValue = useMemo(
    () => ({
      user: state.user,
      method: 'jwt',
      loading: status === 'loading',
      authenticated: status === 'authenticated',
      unauthenticated: status === 'unauthenticated',
      //
      login,
      register,
      logout,
      forgotPassword,
      passwordResetChange,
    }),
    [login, logout, register, state.user, status]
  );

  return <AuthContext.Provider value={memoizedValue}>{children}</AuthContext.Provider>;
}
