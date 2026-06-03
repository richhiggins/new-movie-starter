import {defineConfig, isKeySegment} from 'sanity'
import {structureTool} from 'sanity/structure'
import {visionTool} from '@sanity/vision'
import {internationalizedArray} from 'sanity-plugin-internationalized-array'
import {languageFilter} from '@sanity/language-filter'
import {schemaTypes} from './schemaTypes'
import {media} from 'sanity-plugin-media'

const languages = [
  {id: 'en', title: 'English'},
  {id: 'fr', title: 'French'},
  {id: 'de', title: 'German'},
]

const languagesFR = [
  {id: 'fr', title: 'French'},
  {id: 'en', title: 'English'},
  {id: 'de', title: 'German'},
]

export default defineConfig([
  {
    name: 'default',
    title: 'English language',
    basePath: '/en',
    projectId: 'i19d2d0w',
    dataset: 'production',

    plugins: [
      structureTool(),
      visionTool(),
      internationalizedArray({
        languages,
        fieldTypes: ['text', 'string'],
        //      buttonAddAll: false,
        //      buttonLocations: ['unstable__fieldAction'],
      }),
      languageFilter({
        supportedLanguages: languages,
        defaultLanguages: ['en'],
        documentTypes: ['person'],
        filterField: (enclosingType, member, selectedLanguageIds) => {
          // Filter internationalized arrays
          if (
            enclosingType.jsonType === 'object' &&
            enclosingType.name.startsWith('internationalizedArray') &&
            'kind' in member
          ) {
            // Get last two segments of the field's path
            const pathEnd = member.field.path.slice(-2)
            // If the second-last segment is a _key, and the last segment is `value`,
            // It's an internationalized array value
            // And the array _key is the language of the field
            const language =
              pathEnd[1] === 'value' && isKeySegment(pathEnd[0]) ? pathEnd[0]._key : null

            return language ? selectedLanguageIds.includes(language) : false
          }

          // Filter internationalized objects if you have them
          // `localeString` must be registered as a custom schema type
          if (enclosingType.jsonType === 'object' && enclosingType.name.startsWith('locale')) {
            return selectedLanguageIds.includes(member.name)
          }

          return true
        },
      }),
      media(),
    ],

    schema: {
      types: schemaTypes,
    },
    form: {
      components: {
        portableText: {
          plugins: (props) => {
            return props.renderDefault({
              ...props,
              plugins: {
                ...props.plugins,
                pasteLink: {
                  //                enabled: false
                },
              },
            })
          },
        },
      },
    },
  },
  {
    name: 'default-fr',
    title: 'French language',
    basePath: '/fr',
    projectId: 'i19d2d0w',
    dataset: 'production-fr',

    plugins: [
      structureTool(),
      //      visionTool(),
      internationalizedArray({
        languages: languagesFR,
        fieldTypes: ['text', 'string'],
        //      buttonAddAll: false,
        //      buttonLocations: ['unstable__fieldAction'],
      }),
      languageFilter({
        supportedLanguages: languagesFR,
        defaultLanguages: ['fr'],
        documentTypes: ['person'],
        filterField: (enclosingType, member, selectedLanguageIds) => {
          // Filter internationalized arrays
          if (
            enclosingType.jsonType === 'object' &&
            enclosingType.name.startsWith('internationalizedArray') &&
            'kind' in member
          ) {
            // Get last two segments of the field's path
            const pathEnd = member.field.path.slice(-2)
            // If the second-last segment is a _key, and the last segment is `value`,
            // It's an internationalized array value
            // And the array _key is the language of the field
            const language =
              pathEnd[1] === 'value' && isKeySegment(pathEnd[0]) ? pathEnd[0]._key : null

            return language ? selectedLanguageIds.includes(language) : false
          }

          // Filter internationalized objects if you have them
          // `localeString` must be registered as a custom schema type
          if (enclosingType.jsonType === 'object' && enclosingType.name.startsWith('locale')) {
            return selectedLanguageIds.includes(member.name)
          }

          return true
        },
      }),
      media(),
    ],

    schema: {
      types: schemaTypes,
    },
    form: {
      components: {
        portableText: {
          plugins: (props) => {
            return props.renderDefault({
              ...props,
              plugins: {
                ...props.plugins,
                pasteLink: {
                  //                enabled: false
                },
              },
            })
          },
        },
      },
    },
  },
])
