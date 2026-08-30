import careImage from '../assets/tree-care.png';
import removalImage from '../assets/tree-removal.png';

export const services = {
  'tree-pruning': {
    name: 'Tree Pruning', eyebrow: 'Pruning & clearance',
    description: 'Professional tree pruning in Mount Kisco and Westchester County for clearance, damaged branches, mature tree structure, and property needs.',
    intro: 'Selective pruning can improve clearance, address damaged branches, and help a mature tree work better with the property around it.',
    image: careImage, alt: 'Arborist inspecting a mature maple before tree pruning',
    sections: [
      { title: 'Pruning with a reason', body: 'Every cut should have a purpose. That may be clearance from a roof or driveway, removal of damaged wood, or attention to a branch that has become poorly placed as the tree matured.' },
      { title: 'Common reasons to call', body: 'Branches over roofs or parking areas, storm-broken limbs, obstructed views and access, deadwood, or concern about how a tree is developing are all useful reasons to schedule a closer look.', bullets: ['Roof and structure clearance', 'Dead or damaged branch removal', 'Canopy and access considerations', 'Mature-tree maintenance'] },
      { title: 'A site-specific recommendation', body: 'Species, age, condition, season, surrounding targets, and the amount of live canopy involved all matter. We review the tree in context before agreeing on the scope.' }
    ]
  },
  'tree-removal': {
    name: 'Tree Removal', eyebrow: 'Controlled tree work',
    description: 'Carefully planned tree removal in Mount Kisco and nearby Westchester County communities. Call Ecology Tree Service at (914) 242-9892.',
    intro: 'When a tree is declining, damaged, poorly located, or no longer viable, removal requires planning for the tree and everything around it.',
    image: removalImage, alt: 'Crew performing a controlled sectional tree removal on a Westchester street',
    sections: [
      { title: 'The property sets the plan', body: 'Tree size is only one part of removal. Access, buildings, roads, landscape features, utility lines, slope, and the available drop zone all influence the safest practical approach.' },
      { title: 'Controlled, sectional work', body: 'In tighter areas, the tree may need to be dismantled in sections and material lowered under control. The appropriate method is determined from the actual site.', bullets: ['Site and access review', 'Rigging and lowering considerations', 'Work-zone planning', 'Debris cleanup'] },
      { title: 'Not every concern means removal', body: 'If the tree may be retained, we can discuss whether targeted pruning or another scope better addresses the concern. The goal is a clear recommendation for the property—not removal by default.' }
    ]
  },
  'storm-damage': {
    name: 'Storm-Damaged Trees', eyebrow: 'After wind, rain & snow',
    description: 'Help with storm-damaged trees and broken limbs in Mount Kisco and Westchester County. Stay clear of hazards and call (914) 242-9892.',
    intro: 'Broken limbs and shifted trees can remain unstable after the weather clears. Keep people away from the area and address utility hazards first.',
    image: removalImage, alt: 'Tree-service crew working in a controlled zone after storm damage',
    sections: [
      { title: 'Safety before cleanup', body: 'Do not stand below hanging limbs, walk beneath a split canopy, or approach a tree in contact with wires. Contact the utility or emergency services first when power lines are involved.' },
      { title: 'What to tell us', body: 'Share the property address, what failed, whether a building or driveway is affected, and whether utilities are nearby. Photos can help only when they can be taken from a safe location.', bullets: ['Hanging or broken limbs', 'Split stems and uprooted trees', 'Blocked access', 'Damage near structures'] },
      { title: 'Assessment after the immediate work', body: 'Storm work may include removing the failed material and looking at what remains. A tree that lost a major part of its canopy may need a broader decision once the immediate hazard is controlled.' }
    ]
  },
  'stump-grinding': {
    name: 'Stump Grinding', eyebrow: 'Finish the space',
    description: 'Stump grinding for properties in Mount Kisco and nearby Westchester County communities. Clear space after tree removal with Ecology Tree Service.',
    intro: 'A remaining stump can interrupt mowing, planting, access, and the next plan for the landscape. Grinding helps return that space to use.',
    image: careImage, alt: 'Detailed view of professional tree-care equipment on a Westchester property',
    sections: [
      { title: 'Plan for what comes next', body: 'The useful grinding scope depends on the stump size, access, nearby hardscape, visible surface roots, and whether the area will become lawn, planting bed, or another landscape feature.' },
      { title: 'Before stump work begins', body: 'Known irrigation, landscape lighting, buried utilities, fencing, and tight gates should be discussed before scheduling. Utility locating may be needed depending on the site.', bullets: ['Post-removal stump cleanup', 'Surface-root considerations', 'Access and gate review', 'Preparation for landscape reuse'] },
      { title: 'A practical finished area', body: 'Grinding creates a mix of wood material and soil. The final restoration plan varies with the intended use of the space and should be discussed as part of the estimate.' }
    ]
  }
} as const;

export type Service = (typeof services)[keyof typeof services];
