'use strict'

// import { ipcRenderer } from 'electron'
import React from 'react'
import ReactDom from 'react-dom'
import { Provider } from 'react-redux'
import ReqPromise from 'request-promise'
import AppContainer from './containers/appContainer'

const USER_GISTS_URI = 'https://api.github.com/users/hackjutsu/gists'

// how to import action creators?
import { createStore, applyMiddleware } from 'redux'
import thunk from 'redux-thunk'
import { updateGists, updateLangTags, selectLangTag, updateAccessToken } from './actions/index'
import RootReducer from './reducers'

const store = createStore(
    RootReducer,
    applyMiddleware(thunk)
)

// Get access token from the main process
let rawAccessToken = /access_token=([^&]*)/.exec(global.location)
let accessToken = (rawAccessToken && rawAccessToken.length > 1) ? rawAccessToken[1] : null
_updateAccessToken(accessToken)

function _updateAccessToken (token) {
  store.dispatch(updateAccessToken(token))
}

function _updateGistStore (gists) {
  store.dispatch(updateGists(gists))
}

function _updateLangTags (langsTags) {
  console.log('** Inside _updateLangTags')
  store.dispatch(updateLangTags(langsTags))
}

function _updateActiveLangTag (activeTag) {
  store.dispatch(selectLangTag(activeTag))
}

function _makeOption (uri) {
  return {
    uri: uri,
    headers: {
      'User-Agent': 'Request-Promise',
    },
    qs: {
      access_token: accessToken
    },
    json: true // Automatically parses the JSON string in the response
  }
}

ReqPromise(_makeOption(USER_GISTS_URI))
  .then((gistList) => {
    console.log('The length of the gist list is ' + gistList.length)
    let gists = {}
    let langsTags = {}
    let activeTag = ''

    gistList.forEach((gist) => {
      let langs = new Set()

      for (let key in gist.files) {
        if (gist.files.hasOwnProperty(key)) {
          let file = gist.files[key]
          let language = file.language
          langs.add(language)
          if (langsTags.hasOwnProperty(language)) {
            langsTags[language].add(gist.id)
          } else {
            if (!activeTag) activeTag = language
            langsTags[language] = new Set()
            langsTags[language].add(gist.id)
          }
        }
      }

      gists[gist.id] = {
        langs: langs,
        brief: gist,
        details: null
      }
    }) // gistList.forEach

    // initialize the redux store
    _updateGistStore(gists)
    _updateLangTags(langsTags)
    _updateActiveLangTag(activeTag)

    console.log('** before ReactDom.render')
    ReactDom.render(
      <Provider store={ store }>
        <AppContainer />
      </Provider>,
      document.getElementById('container')
    )
  })
  .catch(function (err) {
    console.log('The request has failed: ' + err)
  })

console.log('end')
