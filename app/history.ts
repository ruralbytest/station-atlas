/** Facts about installation/relocation are separate from the launch-date filter.
 * The NASA asset has one projected configuration, not historical stage transforms.
 */
export const HISTORY:Record<string,{text:string;url:string}[]>={
 p6:[{text:'Installed above Z1 on December 3, 2000; relocated to the outboard port truss on October 30, 2007. This reference mesh shows the later position throughout launch history.',url:'https://www.nasa.gov/international-space-station/integrated-truss-structure/'}],
 node2:[{text:'Installed temporarily on Unity’s port side on October 26, 2007. Harmony and PMA-2 moved to Destiny’s forward port on November 14, 2007. Temporary positions are not reconstructed here.',url:'https://www.esa.int/Science_Exploration/Human_and_Robotic_Exploration/Columbus/Harmony_moved_to_final_location'}],
 pma2:[{text:'PMA-2 changed ports as the station grew. It moved with Harmony to Destiny’s forward port on November 14, 2007. This mesh stays in the projected reference position.',url:'https://www.esa.int/Science_Exploration/Human_and_Robotic_Exploration/Columbus/Harmony_moved_to_final_location'}],
 mlm:[{text:'Nauka docked on July 29, 2021. This is the projected MLM geometry from NASA’s February 2011 model, not the as-flown 2021 configuration.',url:'https://www.nasa.gov/blogs/spacestation/2021/07/29/new-module-successfully-docks-to-space-station/'}],
 era:[{text:'The European Robotic Arm flew with Nauka in 2021. Its geometry and pose here come from the projected 2011 source model.',url:'https://www.esa.int/Science_Exploration/Human_and_Robotic_Exploration/International_Space_Station/European_Robotic_Arm'}],
};
