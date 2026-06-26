export type ObjectClass = 'Safe' | 'Euclid' | 'Keter' | 'Thaumiel' | 'Apollyon' | 'Neutralized'

export interface ScpEntry {
  id: string
  number: number
  name: string
  objectClass: ObjectClass
  summary: string
  containment: string
  description: string
  addenda?: string[]
  tags: string[]
  date: string
  author: string
}

export interface Document {
  id: string
  title: string
  type: 'protocol' | 'research' | 'incident' | 'directive'
  summary: string
  content: string
  date: string
  classification: 'Unclassified' | 'Restricted' | 'Confidential' | 'Secret' | 'Top Secret'
}

export interface SiteStats {
  totalEntries: number
  byClass: Record<ObjectClass, number>
  documents: number
  personnel: number
}
