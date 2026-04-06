export function classifyArticle(title: string, description: string): string {
  const text = `${title} ${description}`.toLowerCase()

  if (text.match(/election|government|senate|president|minister|policy/))
    return "Politics"

  if (text.match(/stock|market|economy|inflation|company|startup|bank/))
    return "Business"

  if (text.match(/match|tournament|goal|cricket|football|nba|olympics/))
    return "Sports"

  if (text.match(/movie|actor|celebrity|music|film|tv|hollywood/))
    return "Entertainment"

  if (text.match(/ai|technology|software|startup|gadget|iphone|android|science/))
    return "Technology"

  if (text.match(/health|virus|hospital|mental|fitness|diet|covid/))
    return "Health"

  if (text.match(/crime|murder|arrest|police|court|law|justice/))
    return "Crime"

  if (text.match(/travel|food|fashion|culture|lifestyle|festival/))
    return "Lifestyle"

  if (text.match(/school|university|exam|education|student/))
    return "Education"

  return "World"
}