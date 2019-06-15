import Vuex from 'vuex'

const createStore = () => {
  return new Vuex.Store({
    state: {
      headlines: [],
      category: '',
      country: 'us',
      loading: false,
      token: ''
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
            '/register/',
            userPayload
          )
          commit('setToken', authUserData.idToken)
          console.log(authUserData)
          commit('setLoading', false)
        } catch (err) {
          console.log(err)
          commit('setLoading', false)
        }
      }
    },
    getters: {
      headlines: state => state.headlines,
      category: state => state.category,
      loading: state => state.loading,
      country: state => state.country,
      isAuthenticated: state => !!state.token
    }
  })
}

export default createStore
