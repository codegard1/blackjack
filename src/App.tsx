// React
import React from 'react';

// FluentUI
import {
  Layer,
  Stack,
  Text,
  initializeIcons
} from '@fluentui/react';

// Local Resources
import './App.css';


// Necessary in order for Fluent Icons to render on the page
initializeIcons();

// Main Component
const App = () => {

  return (
    <React.Fragment>
      <Layer>
        <Text block>SplashScreen</Text>
        <Text block>OptionsPanel</Text>
      </Layer>
      <Stack tokens={{ childrenGap: 15 }} horizontalAlign='space-between' verticalAlign='space-evenly'>
      </Stack>
    </React.Fragment>
  );
}

export default App;
