import {defineField, defineType} from 'sanity'
import {MdLocalMovies as icon} from 'react-icons/md'

export default defineType({
  name: 'movie',
  title: 'Movie',
  type: 'document',
  icon,
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      options: {
        source: 'title',
        maxLength: 100,
      },
    }),
    defineField({
      name: 'overview',
      title: 'Overview',
      type: 'blockContent',
    }),
    defineField({
      name: 'releaseDate',
      title: 'Release date',
      type: 'datetime',
    }),
    defineField({
      name: 'poster',
      title: 'Poster Image',
      type: 'image',
      options: {
        hotspot: true,
      },
    }),
    defineField({
      name: 'externalId',
      title: 'External ID',
      type: 'number',
    }),
    defineField({
      name: 'popularity',
      title: 'Popularity',
      type: 'number',
    }),
    defineField({
      name: 'castMembers',
      title: 'Cast Members',
      type: 'array',
      of: [{type: 'castMember'}],
    }),
    defineField({
      name: 'crewMembers',
      title: 'Crew Members',
      type: 'array',
      of: [{type: 'crewMember'}],
    }),
    defineField({
      name: 'movieOrPersonType',
      title: 'Movie or Person Type',
      type: 'string',
      options: {
        list: [
          {title: 'Movie', value: 'movie'},
          {title: 'Person', value: 'person'},
        ],
      },
    }),
    // this doesnt filter the reference type only sets up the creation type
    defineField({
      name: 'movieOrPerson',
      title: 'Movie or Person',
      type: 'reference',
      to: [{type: 'movie'}, {type: 'person'}],
      options: {
        creationTypeFilter: ({document}, toTypes) => {
          if (document.movieOrPersonType === 'movie') {
            return toTypes.filter((t) => t.type === 'movie')
          }
          if (document.movieOrPersonType === 'person') {
            return toTypes.filter((t) => t.type === 'person')
          }
          return toTypes
        },
      },
    })
  ],
  preview: {
    select: {
      title: 'title',
      date: 'releaseDate',
      media: 'poster',
      castName0: 'castMembers.0.person.name',
      castName1: 'castMembers.1.person.name',
    },
    prepare(selection) {
      const year = selection.date && selection.date.split('-')[0]
      const cast = [selection.castName0, selection.castName1].filter(Boolean).join(', ')

      return {
        title: `${selection.title} ${year ? `(${year})` : ''}`,
        date: selection.date,
        subtitle: cast,
        media: selection.media,
      }
    },
  },
})
