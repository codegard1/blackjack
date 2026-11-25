import React from 'react';
import { IProfileAction } from '../../shared/IProfileAction';
import { ProfileState } from '../../shared';
import { mergeProfileStates, profileReducer } from '../game/profiles';
import { useRemoteSync } from './useRemoteSync';

export { SYNC_DEBOUNCE_MS } from './useRemoteSync';

const isProfileState = (value: unknown): value is ProfileState =>
  typeof value === 'object' && value !== null && Array.isArray((value as ProfileState).profiles);

/** Keep the player profiles in step with the server; see useRemoteSync */
export function useProfileSync(
  profiles: ProfileState,
  dispatch: React.Dispatch<IProfileAction>,
  options: { enabled?: boolean } = {},
): void {
  useRemoteSync<ProfileState>({
    kind: 'profiles',
    value: profiles,
    // the reducer repairs what it is given; preview exactly what it will produce
    preview: (remote) => (isProfileState(remote) ? profileReducer(profiles, { type: 'replace', state: remote }) : undefined),
    merge: (remote, local) => (isProfileState(remote) ? mergeProfileStates(remote, local) : undefined),
    replace: (remote) => dispatch({ type: 'replace', state: remote as ProfileState }),
    ...options,
  });
}
