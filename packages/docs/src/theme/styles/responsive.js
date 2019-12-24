import facepaint from 'facepaint'

export const breakpoints = {
  mobile: 500,
  tablet: 920,
  desktop: 1120,
}

export const mq = facepaint([
  `@media(min-width: ${breakpoints.mobile}px)`,
  `@media(min-width: ${breakpoints.tablet}px)`,
  `@media(min-width: ${breakpoints.desktop}px)`,
])
