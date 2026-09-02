import pruningImage from '../assets/service-pruning-detail.png';
import removalImage from '../assets/service-removal-detail.png';
import stormImage from '../assets/service-storm-detail.png';
import stumpImage from '../assets/service-stump-detail.png';
import plantingImage from '../assets/service-planting-detail.png';

export const services = {
  'tree-pruning': {
    name: 'Tree Pruning', eyebrow: 'Pruning & clearance',
    description: 'Professional tree pruning, crown thinning, cabling and bracing in Mount Kisco, Westchester County and Lower Connecticut.',
    intro: 'Selective pruning can improve clearance, reduce excess crown density, address damaged branches, and help a mature tree work better with the property around it.',
    image: pruningImage, alt: 'Professional arborist pruning a mature maple from a marked residential work zone',
    sections: [
      { title: 'Pruning with a reason', body: 'Every cut should have a purpose. That may be clearance from a roof or driveway, removal of damaged wood, or attention to a branch that has become poorly placed as the tree matured.' },
      { title: 'Selective crown thinning', body: 'Crown thinning—also called reducing crown density—selectively removes crowded, weakly attached, or low-vigor branches, usually toward the canopy edge. When appropriate, it can allow more light and air through the crown while preserving the tree’s natural form and interior growth. It is not the indiscriminate removal of leaves or inner branches; the amount of live growth removed must fit the species, condition, and objective.' },
      { title: 'Cabling and bracing', body: 'Some trees with weak branch unions or stems may be candidates for added support. Cables can limit movement between branches, while bracing rods can reinforce a weak union. These systems may complement pruning after an on-site assessment, but they do not guarantee against failure and require periodic inspection.', bullets: ['Assessment of weak unions and stems', 'Support-system planning and installation', 'Pruning to manage weight where appropriate', 'Ongoing inspection recommendations'] },
      { title: 'Common reasons to call', body: 'Branches over roofs or parking areas, storm-broken limbs, obstructed views and access, deadwood, excess crown density, or concern about how a tree is developing are all useful reasons to schedule a closer look.', bullets: ['Roof and structure clearance', 'Dead or damaged branch removal', 'Selective crown-density reduction', 'Mature-tree maintenance'] },
      { title: 'A site-specific recommendation', body: 'Species, age, condition, season, surrounding targets, and the amount of live canopy involved all matter. We review the tree in context before agreeing on the scope.' }
    ]
  },
  'tree-removal': {
    name: 'Tree Removal', eyebrow: 'Controlled tree work',
    description: 'Carefully planned tree removal, including crane-assisted work when appropriate, in Westchester County and Lower Connecticut.',
    intro: 'When a tree is declining, damaged, poorly located, or no longer viable, removal requires planning for the tree and everything around it.',
    image: removalImage, alt: 'Tree-service professional cutting a trunk section safely supported on the ground after a controlled removal',
    sections: [
      { title: 'The property sets the plan', body: 'Tree size is only one part of removal. Access, buildings, roads, landscape features, utility lines, slope, and the available drop zone all influence the safest practical approach.' },
      { title: 'Controlled, sectional work', body: 'In tighter areas, the tree may need to be dismantled in sections and material lowered under control. The appropriate method is determined from the actual site.', bullets: ['Site and access review', 'Rigging and lowering considerations', 'Work-zone planning', 'Debris cleanup'] },
      { title: 'Crane-assisted removal when appropriate', body: 'When tree size, condition, access, or valuable targets below make other methods less practical, a properly planned crane-assisted removal may improve control, safety, and jobsite efficiency. The crane can lift carefully rigged sections away from roofs, landscaping, and restricted drop zones. Crane use is site-specific and depends on setup space, ground conditions, load planning, and clear crew communication.' },
      { title: 'Not every concern means removal', body: 'If the tree may be retained, we can discuss whether targeted pruning or another scope better addresses the concern. The goal is a clear recommendation for the property—not removal by default.' }
    ]
  },
  'storm-damage': {
    name: 'Storm-Damaged Trees', eyebrow: 'After wind, rain & snow',
    description: 'Help with storm-damaged trees and broken limbs in Westchester County and Lower Connecticut. Utility hazards must be secured first.',
    intro: 'Broken limbs and shifted trees can remain unstable after the weather clears. Keep people away from the area and address utility hazards first.',
    image: stormImage, alt: 'Tree-service crew using compact equipment to clear grounded storm debris from a driveway',
    sections: [
      { title: 'Safety before cleanup', body: 'Never touch, move, or drive over a downed wire. Do not assume a line is harmless because it appears to be telephone, cable, or fiber. A fallen power line can energize nearby trees, branches, fences, vehicles, water, and communication lines. Keep people and pets away, report the hazard to the electric utility and emergency services, and wait for the utility to confirm the area is de-energized and safe.' },
      { title: 'Our downed-line policy', body: 'Ecology Tree Service does not touch or move downed lines—even wires that appear to be cable or telephone—or fences and other objects that may have become energized. Utility personnel must secure and release the work area before tree cleanup can begin.' },
      { title: 'What to tell us', body: 'Share the property address, what failed, whether a building or driveway is affected, and whether utilities are nearby. Photos can help only when they can be taken from a safe location.', bullets: ['Hanging or broken limbs', 'Split stems and uprooted trees', 'Blocked access', 'Damage near structures'] },
      { title: 'Assessment after the immediate work', body: 'Storm work may include removing the failed material and looking at what remains. A tree that lost a major part of its canopy may need a broader decision once the immediate hazard is controlled.' }
    ]
  },
  'stump-grinding': {
    name: 'Stump Grinding', eyebrow: 'Finish the space',
    description: 'Stump grinding for properties in Westchester County and Lower Connecticut, with the finished depth planned around the site’s next use.',
    intro: 'A remaining stump can interrupt mowing, planting, access, and the next plan for the landscape. Grinding helps return that space to use.',
    image: stumpImage, alt: 'Tree-service professional finishing a landscaped area after stump grinding',
    sections: [
      { title: 'Plan for what comes next', body: 'The useful grinding scope depends on the stump size, access, nearby hardscape, visible surface roots, and whether the area will become lawn, planting bed, or another landscape feature.' },
      { title: 'What grinding removes', body: 'Stump grinding reduces the visible stump to wood chips and normally works below the surrounding grade. It is different from excavating the entire underground stump and root system. Depending on access, buried utilities, rocks, nearby hardscape, and the agreed depth, some stump wood or roots may remain below ground while the stump is no longer visible at the surface.' },
      { title: 'Before stump work begins', body: 'Known irrigation, landscape lighting, buried utilities, fencing, and tight gates should be discussed before scheduling. Utility locating may be needed depending on the site.', bullets: ['Post-removal stump cleanup', 'Surface-root considerations', 'Access and gate review', 'Preparation for landscape reuse'] },
      { title: 'A practical finished area', body: 'Grinding creates a mix of wood material and soil. The final depth, chip removal, backfill, and restoration plan vary with the intended use of the space and should be discussed as part of the estimate.' }
    ]
  },
  'tree-planting': {
    name: 'Tree Planting', eyebrow: 'Right tree · right place',
    description: 'Professional tree planting and site-aware species selection in Mount Kisco, Westchester County and Lower Connecticut.',
    intro: 'A successful planting begins before the hole is dug—with the right tree, the right location, and a plan for establishment after installation.',
    image: plantingImage, alt: 'Ecology Tree Service crew planting a young shade tree with the root flare set at the proper grade',
    sections: [
      { title: 'Match the tree to the property', body: 'We consider available sunlight, soil and drainage, mature height and spread, nearby buildings, overhead and underground utilities, and what you want the tree to contribute to the landscape. Choosing for the mature tree—not just its size on planting day—helps prevent future conflicts.', bullets: ['Site and space review', 'Species and mature-size considerations', 'Utility and structure clearance', 'Landscape goals'] },
      { title: 'Plant at the right depth', body: 'The planting hole should be broad but no deeper than the root ball, with the trunk flare visible at or slightly above the surrounding grade. The tree is handled by the root ball, set straight, and backfilled carefully. Burlap, wire, and circling roots are addressed so they do not interfere with establishment.' },
      { title: 'Finish for establishment', body: 'Proper watering and mulch help reduce transplant stress and protect soil moisture. Mulch belongs over the root area, not against the trunk. Staking is used only when site conditions require it and should be removed after the establishment period. Public utilities must be located before digging.' },
      { title: 'Plan the first seasons', body: 'A newly planted tree needs follow-up care while roots expand into the surrounding soil. We can discuss watering, mulch, protection, and early structural care so the investment has the best opportunity to establish.' }
    ]
  }
} as const;

export type Service = (typeof services)[keyof typeof services];
