import { Reducer } from 'redux'
import { RoutedAction, isChannel, isPrivate } from '@app/utils/Route'
import { RouteState, routeInitialState, reduceRoute } from '@app/reducers/route'
import { ServerState, reduceServer } from '@app/reducers/server'
import { CLOSE_WINDOW } from '@app/actions/ui'
import { CONNECT_TO_SERVER } from '@app/actions/socket'
import { CaseReducerMap } from '@app/utils/CaseReducerMap'

type RootPartialState = Readonly<{
  servers: Readonly<{ [key: string]: ServerState }>
}>

export type RootState = Readonly<{
  route: RouteState
}> &
  RootPartialState

type RootReducer<S = RootState> = (
  root: S,
  action: RoutedAction,
  extraStates: { root: RootState },
) => S

export const rootInitialState = {
  servers: {},
  route: routeInitialState,
}

const caseReducers: CaseReducerMap<RootReducer<RootPartialState>> = {
  [CLOSE_WINDOW]: (root, action, _) => {
    const thereIsOnlyOneServer = Object.keys(root.servers).length <= 1
    const isChannelOrPrivate =
      isChannel(action.route.bufferKey) || isPrivate(action.route.bufferKey)

    if (thereIsOnlyOneServer || isChannelOrPrivate) {
      return root
    }

    const servers = { ...root.servers }
    delete servers[action.route.serverKey]
    return { servers }
  },
}

const routeActionToServers = (
  servers: { [key: string]: ServerState },
  action: RoutedAction,
  extraStates: { route: RouteState },
) =>
  action.route.serverKey in servers || action.type === CONNECT_TO_SERVER
    ? {
        ...servers,
        [action.route.serverKey]: reduceServer(
          servers[action.route.serverKey],
          action,
          extraStates,
        ),
      }
    : servers

export const reduceRoot: Reducer<RootState, RoutedAction> = (
  root = rootInitialState,
  action,
) => {
  // prevent other actions to pass inside app reducers
  if (action.route === undefined) {
    return root
  }

  const intermediateState = {
    ...root,
    route: reduceRoute(root.route, action, { root }),
    servers: routeActionToServers(root.servers, action, { route: root.route }),
  }

  return {
    ...intermediateState,
    ...(action.type in caseReducers
      ? caseReducers[action.type](intermediateState, action, {
          root: intermediateState,
        })
      : {}),
  }
}

export const selectServers = ({
  servers,
}: RootState): {
  [key: string]: ServerState
} => servers
