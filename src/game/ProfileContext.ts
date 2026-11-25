import { Dispatch, createContext, useContext } from 'react';
import { defaultProfileState } from './profiles';
import { IProfileAction } from '../../shared/IProfileAction';
import { ProfileState } from '../../shared';

// Create context with default values
export const ProfileContext = createContext<ProfileState>(defaultProfileState());
export const ProfileDispatchContext = createContext<Dispatch<IProfileAction>>(() => { });

// Custom hook to consume context
export const useProfileContext = () => {
  const profiles = useContext(ProfileContext);
  const profileDispatch = useContext(ProfileDispatchContext);

  if (!profiles || !profileDispatch) {
    throw new Error('useProfileContext must be used within a ProfileProvider');
  }

  return { profiles, profileDispatch };
}
