// React
import React from 'react';

// Local Resources
import { IAppContextProps } from '../interfaces';

// Create the default Context object with mostly dummy values
const AppContext = React.createContext<IAppContextProps>({
  initializeStores: () => { },
  clearStores: () => { },
});

export default AppContext;
