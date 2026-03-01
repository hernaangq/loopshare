const FALLBACK_BUILDING_IMAGES = [
  'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=1200',
  'https://images.unsplash.com/photo-1494522855154-9297ac14b55f?w=1200',
  'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=1200',
  'https://images.unsplash.com/photo-1497366216548-37526070297c?w=1200',
  'https://images.unsplash.com/photo-1497366811353-6870744d04b2?w=1200',
  'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=1200',
  'https://images.unsplash.com/photo-1517502884422-41eaead166d4?w=1200',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=1200',
  'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=1200',
  'https://images.unsplash.com/photo-1462826303086-329426d1aef5?w=1200',
  'https://images.unsplash.com/photo-1497215842964-222b430dc094?w=1200',
  'https://images.unsplash.com/photo-1556761175-4b46a572b786?w=1200',
  'https://images.unsplash.com/photo-1487958449943-2429e8be8625?w=1200',
  'https://images.unsplash.com/photo-1460317442991-0ec209397118?w=1200',
  'https://images.unsplash.com/photo-1448630360428-65456885c650?w=1200',
]

function hashString(value = '') {
  let hash = 0
  for (let index = 0; index < value.length; index += 1) {
    hash = ((hash << 5) - hash) + value.charCodeAt(index)
    hash |= 0
  }
  return Math.abs(hash)
}

export function getBuildingImage(building) {
  if (building?.imageUrl) {
    return building.imageUrl
  }

  const stableKey = `${building?.id ?? ''}|${building?.name ?? ''}|${building?.address ?? ''}`
  const index = hashString(stableKey) % FALLBACK_BUILDING_IMAGES.length
  return FALLBACK_BUILDING_IMAGES[index]
}
