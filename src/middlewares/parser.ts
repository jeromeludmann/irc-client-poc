import { Middleware, Action } from "redux";
import {
  RAW_MESSAGES_RECEIVED,
  RawMessagesReceivedAction,
} from "@app/actions/network";
import {
  IncomingMessageActionCreator,
  Prefix,
  join,
  nick,
  notice,
  ping,
  privmsg,
} from "@app/actions/message-in";

export const parser: Middleware = () => next => (
  action: RawMessagesReceivedAction,
) => {
  next(action);

  if (action.type === RAW_MESSAGES_RECEIVED) {
    action.payload.messages.forEach(rawMessage => {
      const genericMessage = parseMessage(rawMessage);
      const { prefix, command, params } = genericMessage;

      if (actions.hasOwnProperty(command)) {
        next(actions[command](action.route.server, prefix, params));
      }
    });
  }
};

const actions: {
  [command: string]: IncomingMessageActionCreator<
    Action<string>,
    Prefix | undefined
  >;
} = {
  JOIN: join,
  NICK: nick,
  NOTICE: notice,
  PING: ping,
  PRIVMSG: privmsg,
};

const MESSAGE_LENGTH = 510; // RFC says 512 - "CR" "LF" = 510

const parseMessage = (
  message: string,
): {
  prefix?: Prefix;
  command: string;
  params: string[];
} => {
  if (message.length > MESSAGE_LENGTH) {
    // tslint:disable-next-line
    console.warn(`Unexpected message length: (${MESSAGE_LENGTH} bytes max)`);
  }

  let i;

  // Parse prefix

  let prefix: Prefix = "";

  if (message.charAt(0) === ":") {
    i = message.indexOf(" ");
    prefix = parsePrefix(message.slice(1, i));
    message = message.slice(i + 1);
  }

  // Parse command

  let command: string;
  i = message.indexOf(" ");
  if (i === -1) {
    i = message.length;
  }
  command = message.slice(0, i);
  message = message.slice(i + 1);

  const params = [];

  // Parse middle parameters

  while (message.length > 0 && message.charAt(0) !== ":") {
    i = message.indexOf(" ");
    if (i === -1) {
      i = message.length;
    }
    const middle = message.slice(0, i);
    params.push(middle);
    message = message.slice(i + 1);
  }

  // Parse trailing parameter
  if (message.length > 0) {
    const trailing = message.slice(1);
    params.push(trailing);
  }

  return { prefix, command, params };
};

const parsePrefix = (prefix: string): Prefix => {
  const i = prefix.indexOf("!");
  if (i === -1) {
    return prefix;
  }

  const j = prefix.indexOf("@");

  return {
    nick: prefix.slice(0, i),
    user: prefix.slice(i + 1, j),
    host: prefix.slice(j + 1),
  };
};
