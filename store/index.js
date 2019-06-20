import Vuex from 'vuex'
import md5 from 'md5'
import db from '~/plugins/firebase'
import slugify from 'slugify'
import { saveUserData, clearUserData } from '~/utils'

const createStore = () => {
  return new Vuex.Store({
    state: {
      headlines: [],
      headline: null,
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
      setHeadline(state, headline) {
        state.headline = headline
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
        const headlines = articles.map(article => {
          const slug = slugify(article.title, {
            replacement: '-',
            remove: /[^a-zA-Z0-9 -]/g,
            lower: true
          })
          const headline = { ...article, slug }
          return headline
        })
        commit('setLoading', false)
        commit('setHeadlines', headlines)
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
      },
      async saveHeadline(context, headline) {
        const headlineRef = db.collection('headlines').doc(headline.slug)
        let headlineId
        await headlineRef.get().then(doc => {
          if (doc.exists) {
            headlineId = doc.id
          }
        })
        if (!headlineId) {
          await headlineRef.set(headline)
        }
      },
      async loadHeadline(context, headlineSlug) {
        const headlineRef = db.collection('headlines').doc(headlineSlug)
        const commentsRef = db.collection(`headlines/${headlineSlug}/comments`)

        let loadedHeadline = {}
        await headlineSlug
        await headlineRef.get().then(async doc => {
          if (doc.exists) {
            loadedHeadline = doc.data()
            await commentsRef.get().then(querySnapshot => {
              if(querySnapshot.empty) {
                this.commit('setHeadline', loadedHeadline)
              }
              let loadedComments = []
              querySnapshot.forEach(doc => {
                loadedComments.push(doc.data())
                loadedHeadline['comments'] = loadedComments
                this.commit('setHeadline', loadedHeadline)
              })
            })
          }
        })
      },
      async sendComment({ state, commit }, comment) {
        const commentsRef = db.collection(`headlines/${state.headline.slug}/comments`)
        commit('setLoading', true)
        await commentsRef.doc(comment.id).set(comment)
        await commentsRef.get().then(querySnapshot => {
          let comments = []
          querySnapshot.forEach(doc => {
            comments.push(doc.data())
            const updateHeadline = { ...state.headline, comments }
            commit('setHeadline', updateHeadline)
          })
        })
      }
    },
    getters: {
      headlines: state => state.headlines,
      headline: state => state.headline,
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
