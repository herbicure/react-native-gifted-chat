import React from 'react';

import {
  ListView,
  View,
} from 'react-native';

import shallowequal from 'shallowequal';
import InvertibleScrollView from 'react-native-invertible-scroll-view';
import md5 from 'md5';
import LoadEarlier from './LoadEarlier';
import Message from './Message';
import FadeInUp from './FadeInUp';

export default class MessageContainer extends React.Component {
  constructor(props) {
    super(props);

    this.renderRow = this.renderRow.bind(this);
    this.renderFooter = this.renderFooter.bind(this);
    this.renderLoadEarlier = this.renderLoadEarlier.bind(this);
    this.renderScrollComponent = this.renderScrollComponent.bind(this);

    const dataSource = new ListView.DataSource({
      rowHasChanged: (r1, r2) => {
        return r1.hash !== r2.hash;
      }
    });

    const messagesData = this.prepareMessages(props.messages);
    this.state = {
      dataSource: dataSource.cloneWithRows(messagesData.blob, messagesData.keys),
      isBubbleAnimationEnabled: false
    };
  }

  prepareMessages(messages) {
    return {
      keys: messages.map(m => m.id),
      blob: messages.reduce((o, m, i) => {
        const previousMessage = messages[i + 1] || {};
        const nextMessage = messages[i - 1] || {};
        // add next and previous messages to hash to ensure updates
        const toHash = JSON.stringify(m) + previousMessage.id + nextMessage.id;
        o[m.id] = {
          ...m,
          previousMessage,
          nextMessage,
          hash: md5(toHash)
        };
        return o;
      }, {})
    };
  }

  shouldComponentUpdate(nextProps, nextState) {
    if(this.props.messages.length !== nextProps.messages.length && this.props.messages.length !== 0) {
      this.setState({ isBubbleAnimationEnabled: true });
    }
    if (!shallowequal(this.props, nextProps)) {
      return true;
    }
    if (!shallowequal(this.state, nextState)) {
      return true;
    }
    return false;
  }

  componentWillReceiveProps(nextProps) {
    if (this.props.messages === nextProps.messages) {
      return;
    }
    const messagesData = this.prepareMessages(nextProps.messages);
    this.setState({
      dataSource: this.state.dataSource.cloneWithRows(messagesData.blob, messagesData.keys)
    });
  }

  renderFooter() {
    if (this.props.renderFooter) {
      const footerProps = {
        ...this.props,
      };
      return this.props.renderFooter(footerProps);
    }
    return null;
  }

  renderLoadEarlier() {
    if (this.props.loadEarlier === true) {
      const loadEarlierProps = {
        ...this.props,
      };
      if (this.props.renderLoadEarlier) {
        return this.props.renderLoadEarlier(loadEarlierProps);
      }
      return (
        <LoadEarlier {...loadEarlierProps}/>
      );
    }
    return null;
  }

  scrollTo(options) {
    this._invertibleScrollViewRef.scrollTo(options);
  }

  renderRow(message, sectionId, rowId) {
    if (!message.id && message.id !== 0) {
      console.warn('GiftedChat: `id` is missing for message', JSON.stringify(message));
    }
    if (!message.user) {
      console.warn('GiftedChat: `user` is missing for message', JSON.stringify(message));
      message.user = {};
    }

    const messageProps = {
      ...this.props,
      key: message.id,
      currentMessage: message,
      previousMessage: message.previousMessage,
      nextMessage: message.nextMessage,
      position: message.user.uid === this.props.user.uid ? 'right' : 'left',
    };

    if (this.props.renderMessage) {
      return this.props.renderMessage(messageProps);
    }
    return this.state.isBubbleAnimationEnabled ? <FadeInUp><Message {...messageProps}/></FadeInUp> : <Message {...messageProps}/>;
  }

  renderScrollComponent(props) {
    const invertibleScrollViewProps = this.props.invertibleScrollViewProps;
    return (
      <InvertibleScrollView
        {...props}
        {...invertibleScrollViewProps}
        ref={component => this._invertibleScrollViewRef = component}
      />
    );
  }

  render() {
    return (
        <View ref='container' style={{flex:1}}>
          <ListView
            enableEmptySections={true}
            keyboardShouldPersistTaps={true}
            automaticallyAdjustContentInsets={false}
            initialListSize={20}
            pageSize={20}

            dataSource={this.state.dataSource}

            renderRow={this.renderRow}
            renderHeader={this.renderFooter}
            renderFooter={this.renderLoadEarlier}
            renderScrollComponent={this.renderScrollComponent}
          />
        </View>
    );
  }
}

MessageContainer.defaultProps = {
  messages: [],
  user: {},
  renderFooter: null,
  renderMessage: null,
  onLoadEarlier: () => {
  },
};

MessageContainer.propTypes = {
  messages: React.PropTypes.array,
  user: React.PropTypes.object,
  renderFooter: React.PropTypes.func,
  renderMessage: React.PropTypes.func,
  onLoadEarlier: React.PropTypes.func,
};
