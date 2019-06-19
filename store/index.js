import Vuex from 'vuex'
import md5 from 'md5'
import db from '~/plugins/firebase'
import { saveUserData, clearUserData } from '~/utils'

const createStore = () => {
  return new Vuex.Store({
    state: {
      headlines: [],
      category: '',
      country: 'us',
      loading: false,
      token: '',
      user: null,
      feed: []
    },
    mutations: {
      setHeadlines(state, headlines) {
        state.headlines = headlines
      },
      setLoading(state, loading) {
        state.loading = loading
      },
      setCategory(state, category) {
        state.category = category
      },
      setCountry(state, country) {
        state.country = country
      },
      setToken(state, token) {
        state.token = token
      },
      clearToken: state => (state.token = ''),
      clearUser: state => (state.user = null),
      clearFeed: state => (state.feed = []),
      setUser(state, user) {
        state.user = user
      },
      setFeed(state, headlines) {
        state.feed = headlines
      }
    },
    actions: {
      async loadHeadlines({ commit }, apiUrl) {
        commit('setLoading', true)
        const { articles } = await this.$axios.$get(apiUrl)
        commit('setLoading', false)
        this.commit('setHeadlines', articles)
      },
      async authenticateUser({ commit }, userPayload) {
        try {
          commit('setLoading', true)
          const authUserData = await this.$axios.$post(
            `/${userPayload.action}/`,
            {
              email: userPayload.email,
              password: userPayload.password,
              returnSecureToken: userPayload.returnSecureToken
            }
          )
          let user
          if (userPayload.action === 'register') {
            const avatar = `http://gravatar.com/avatar/${md5(authUserData.email)}?`
            user = { email: authUserData.email, avatar }
            await db.collection('users').doc(userPayload.email).set(user)
            console.log(user)
          } else {
            const loginRef = db.collection('users').doc(userPayload.email)
            const loggedInUser = await loginRef.get()
            user = loggedInUser.data()
          }
          commit('setUser', user)
          commit('setToken', authUserData.idToken)
          commit('setLoading', false)
          saveUserData(authUserData, user)
        } catch (err) {
          console.log(err)
          commit('setLoading', false)
        }
      },
      setLogoutTimer({ dispatch }, interval) {
        setTimeout(() => dispatch('logoutUser'), interval)
      },
      logoutUser({ commit }) {
        commit('clearToken')
        commit('clearUser')
        commit('clearFeed')
        clearUserData()
      },
      async addHeadlineToFeed({ state }, headline) {
        const feedRef = db.collection(`users/${state.user.email}/feed`).doc(headline.title)
        await feedRef.set(headline)
      },
      async loadUserFeed({ state }) {
        if (state.user) {
          const feedRef = db.collection(`users/${state.user.email}/feed`)
          await feedRef.onSnapshot(querySnapshot => {
            let headlines = []
            querySnapshot.forEach(doc => {
              headlines.push(doc.data())
              this.commit('setFeed', headlines)
            })
            if (querySnapshot.empty) {
              headlines = []
              this.commit('setFeed', headlines)
            }
          })
        }
      },
      async removeHeadlineFromFeed({ state }, headline) {
        const headlineRef = db.collection(`users/${state.user.email}/feed`).doc(headline.title)
        await headlineRef.delete()
      }
    },
    getters: {
      headlines: state => state.headlines,
      category: state => state.category,
      loading: state => state.loading,
      country: state => state.country,
      isAuthenticated: state => !!state.token,
      user: state => state.user,
      feed: state => state.feed
    }
  })
}

export default createStore
