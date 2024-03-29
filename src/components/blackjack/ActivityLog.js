import React from "react";
import * as T from "prop-types";
import {
  ActivityItem,
  DefaultEffects,
  getTheme,
  Icon,
  mergeStyleSets,
  ScrollablePane,
  Sticky,
  StickyPositionType,
  Text,
  nullRender
} from '@fluentui/react';
import { MotionAnimations } from '@fluentui/theme';

// Custom Components 
import BaseComponent from '../BaseComponent';

// Flux Store
import ActivityLogStore from './stores/ActivityLogStore';

// Get Fluent UI theme
const theme = getTheme();

// Fluent UI styles
const classNames = mergeStyleSets({
  // Styles for ActivityItem
  divRoot: {
    animation: MotionAnimations.fadeIn,
    backgroundColor: theme.palette.neutralLighter,
    borderRadius: DefaultEffects.roundedCorner6,
    boxShadow: DefaultEffects.elevation8,
    color: theme.palette.neutralDark,
    margin: '10px',
    maxHeight: '400px',
    width: '410px',
    overflowY: 'hidden',
    padding: '10px',
  },
  activityItemRoot: {
    animation: MotionAnimations.slideLeftIn,
    marginTop: '10px',
    color: theme.palette.neutral,
  },
  nameText: {
    fontWeight: 'bold',
    color: theme.palette.neutral,
  },
  descriptionText: {
    fontWeight: 'normal',
    color: theme.palette.neutral,
  },
  timestamp: {
    fontWeight: 'light',
    color: '#aaa',
    fontSize: 'x-small',
    marginLeft: '10px',
  },
  // Styles for ScrollPanel / Sticky
  wrapper: {
    height: '40vh',
    position: 'relative',
    maxHeight: 'inherit',
  },
  pane: {
    maxWidth: 400,
    border: '1px solid ' + theme.palette.neutralLight,
  },
  sticky: {
    color: theme.palette.neutralSecondary,
    padding: '5px 20px 5px 10px',
    fontSize: '13px',
    borderTop: '1px solid ' + theme.palette.neutralLight,
    borderBottom: '1px solid ' + theme.palette.neutralLight,
  },
});

class ActivityLog extends BaseComponent {
  constructor(props) {
    super(props);

    this.state = {
      activityItems: [],
      nextKey: 1,
    };

    this._bind('onChangeLog', 'createActivityItems');
  }

  static propTypes = {
    hidden: T.bool.isRequired
  }

  componentDidMount() {
    ActivityLogStore.addChangeListener(this.onChangeLog);

    // immediately call onChangeLog to load any pre-existing state from IDB
    this.onChangeLog();
  }

  componentWillUnmount() {
    ActivityLogStore.removeChangeListener(this.onChangeLog);
  }

  onChangeLog() {
    const newState = ActivityLogStore.getState();
    this.setState({ ...newState });
  }

  createActivityItems() {
    // memos for the loop 
    const datememo = [];
    const outputMemo = [];

    // Loop through ActivityItems
    this.state.activityItems.forEach((item, index, arr) => {

      // If the datememo does not contain the current item's timestamp
      // then add it as a Sticky and also add activity items from 
      // the same date

      // format the timestamp as a date string e.g. '11/18/2020'
      const datestamp = item.timestamp.toLocaleDateString('en-US');

      // Check if the datestamp is in the memo
      if (-1 === datememo.indexOf(datestamp)) {
        datememo.push(datestamp);
        // Push the date header
        outputMemo.push(
          <Sticky key={`Sticky-${index}`} stickyPosition={StickyPositionType.Both}>
            <div className={classNames.sticky}>{datestamp}</div>
          </Sticky>
        );

        const filteredItems = arr.filter(v => v.timestamp.toLocaleDateString('en-US') === datestamp);
        // Loop through the items that occurred on the same date as timestamp

        filteredItems.forEach((item1, index1) => {
          outputMemo.push(
            <ActivityItem
              activityDescription={[
                <span key={`ActivityItem-${index1}-1`} className={classNames.nameText}>{item1.name}&nbsp;</span>,
                <span key={`ActivityItem-${index1}-2`} className={classNames.descriptionText}>{item1.description}&nbsp;</span>,
                <span key={`ActivityItem-${index1}-3`} className={classNames.timestamp}>{(item1.timestamp.toLocaleTimeString('en-US'))}&nbsp;</span>,
                <span key={`ActivityItem-${index1}-4`} className={classNames.timestamp}>{(item1.key)}</span>,
              ]}
              activityIcon={<Icon iconName={item1.iconName} />}
              isCompact
              key={item1.key}
              className={classNames.activityItemRoot}
            />
          )
        })
      }
    });

    return outputMemo;
  }

  render() {
    return this.props.hidden ? nullRender() : (
      <div id="ActivityLogRoot" className={classNames.divRoot}>
        <Text block nowrap variant="xLarge">Activity Log</Text>
        <div className={classNames.wrapper}>
          <ScrollablePane styles={{ root: classNames.pane }}>{this.createActivityItems()}</ScrollablePane>
        </div>
      </div>
    );
  }
}

export default ActivityLog;