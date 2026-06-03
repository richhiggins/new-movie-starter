import {defineField, defineType} from 'sanity'
import {MdPerson as icon} from 'react-icons/md'

export default defineType({
  name: 'person',
  title: 'Person',
  type: 'document',
  icon,
  fields: [
    defineField({
      name: 'name',
      title: 'Name',
      type: 'string',
      description: 'Please use "Firstname Lastname" format',
      validation: rule => rule.required()
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      options: {
        source: 'name',
        maxLength: 100,
      },
    }),
    defineField({
      name: 'image',
      title: 'Image',
      type: 'image',
      options: {
        hotspot: true,
      },
    }),
    defineField({
      name: 'biography',
      title: 'Biography',
      type: 'internationalizedArrayText',
      description: 'A short biography of this person',
      validation: (rule) =>
        rule.custom<{value: string; _type: string; _key: string}[]>((value) => {

          if (!value) {
            return 'Biography is required'
          }

          const invalidItems = value.filter(
            (item) => !item.value,  // falsy value
          )

          if (invalidItems.length) {
            return invalidItems.map((item) => ({
              message: `${item._key.toLocaleUpperCase()} Biography is required`,
              path: [{_key: item._key}, 'value'],
            }))
          }

          return true
        }),
    }),
  ],
  preview: {
    select: {title: 'name', media: 'image'},
  },
})
