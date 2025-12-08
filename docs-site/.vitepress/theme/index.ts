import { h } from 'vue'
import DefaultTheme from 'vitepress/theme'
import './custom.css'

export default {
  extends: DefaultTheme,
  enhanceApp({ app }) {
    // Mermaid is supported natively in VitePress 1.6+
    // No additional configuration needed
  }
}
