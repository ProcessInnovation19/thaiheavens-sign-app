import { defineConfig } from 'vitepress'
import { withMermaid } from 'vitepress-plugin-mermaid'

export default withMermaid({
  title: 'ThaiHeavensSignApp\nDocumentation',
  description: 'Complete documentation for ThaiHeavensSignApp',
  // Documentation is served at /docs as static files
  base: '/docs/',
  
  themeConfig: {
    nav: [
      { text: 'Home', link: '/' },
      { text: 'Developer Docs', link: '/DEVELOPER' },
      { text: 'User Guide', link: '/USER_GUIDE' },
      { text: 'AI Documentation', link: '/AI_README_FOR_REPLICATION' }
    ],
    
    sidebar: [
      {
        text: 'Getting Started',
        items: [
          { text: 'Home', link: '/' },
          { text: 'Developer Documentation', link: '/DEVELOPER' },
          { text: 'User Guide', link: '/USER_GUIDE' },
          { text: 'AI Replication Guide', link: '/AI_README_FOR_REPLICATION' }
        ]
      },
      {
        text: 'Developer Documentation',
        items: [
          { text: 'Developer Guide', link: '/DEVELOPER' }
        ]
      },
      {
        text: 'User Guide',
        items: [
          { text: 'User Guide', link: '/USER_GUIDE' }
        ]
      },
      {
        text: 'AI Documentation',
        items: [
          { text: 'AI Replication Guide', link: '/AI_README_FOR_REPLICATION' }
        ]
      },
      {
        text: 'Visual Guides',
        items: [
          { text: 'Guida Visuale (Italiano)', link: '/visual-guide' }
        ]
      },
      {
        text: 'Diagrams',
        items: [
          { text: 'Architecture', link: '/architecture' },
          { text: 'Sequence Diagrams', link: '/sequence_diagrams' },
          { text: 'API Flow', link: '/api_flow' },
          { text: 'Data Model', link: '/data_model' },
          { text: 'User Flow', link: '/user_flow' },
          { text: 'System Lifecycle', link: '/system_lifecycle' },
          { text: 'Deployment', link: '/deployment' }
        ]
      },
      {
        text: 'Deployment Guides',
        items: [
          { text: 'Deploy on Railway', link: '/DEPLOY' },
          { text: 'Deploy on RunCloud', link: '/DEPLOY_RUNCLOUD' }
        ]
      }
    ],
    
    socialLinks: [],
    
    footer: {
      message: 'ThaiHeavensSignApp Documentation',
      copyright: 'Copyright © 2024'
    },
    
    search: {
      provider: 'local'
    }
  },
  
  markdown: {
    lineNumbers: true
  },
  
  mermaid: {
    // Mermaid configuration
    theme: 'default'
  },
  
  // Ignore dead links during build (they're localhost URLs)
  ignoreDeadLinks: true
})
