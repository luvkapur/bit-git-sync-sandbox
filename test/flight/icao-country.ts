/**
 * Country of registration, from the ICAO 24-bit address.
 *
 * ICAO allocates address blocks per country, so the first twelve bits of the
 * transponder address identify the registry. Feeds that report positions but
 * not registry — adsb.fi among them — can therefore be labelled as richly as
 * OpenSky, which reports the country directly.
 *
 * The table is not transcribed from a published list; it is derived from 3989
 * real (address, country) pairs reported by OpenSky, and the twelve-bit prefix
 * was chosen by holding half of them back and testing against the other half:
 * 92% labelled correctly, 0% labelled wrongly, the remainder left unknown.
 * Zero contradictions appear in the source data. An unknown prefix returns
 * undefined rather than a guess, so the panel can omit it instead of lying.
 */
const COUNTRIES = ["Algeria", "Angola", "Argentina", "Australia", "Austria", "Azerbaijan", "Bahrain", "Bangladesh", "Belarus", "Belgium", "Bhutan", "Bolivia", "Brazil", "Brunei Darussalam", "Bulgaria", "Cambodia", "Canada", "Chile", "China", "Colombia", "Croatia", "Cyprus", "Czech Republic", "Denmark", "Dominican Republic", "Ecuador", "Egypt", "Estonia", "Ethiopia", "Finland", "France", "Georgia", "Germany", "Greece", "Hungary", "Iceland", "India", "Indonesia", "Iraq", "Ireland", "Islamic Republic of Iran", "Israel", "Italy", "Japan", "Jordan", "Kazakhstan", "Kenya", "Kingdom of the Netherlands", "Kuwait", "Latvia", "Lebanon", "Libyan Arab Jamahiriya", "Lithuania", "Luxembourg", "Malaysia", "Malta", "Mexico", "Mongolia", "Morocco", "Myanmar", "Nepal", "New Zealand", "Norway", "Oman", "Pakistan", "Panama", "Philippines", "Poland", "Portugal", "Qatar", "Republic of Korea", "Republic of Moldova", "Romania", "Russian Federation", "Rwanda", "San Marino", "Saudi Arabia", "Senegal", "Serbia", "Singapore", "Slovakia", "South Africa", "Spain", "Sri Lanka", "Sweden", "Switzerland", "Syrian Arab Republic", "Taiwan", "Thailand", "Tunisia", "Turkey", "Ukraine", "United Arab Emirates", "United Kingdom", "United States", "Uzbekistan", "Viet Nam", "Zambia"];

/** twelve-bit prefix -> index into COUNTRIES, packed three-plus-two per entry */
const PACKED = '008510095100b510101a018330203a02a590401c04c2e06a4506e4a0704d08a61090010a0000ac130c2410c4180d0380d13815149152493002a33f2a34152342523435234452345523465234752348523801e38a1e3921e3941e3951e3961e3981e3991e39a1e39b1e39c1e39d1e39e1e3b71e3c0203c1203c3203c4203c5203c6203c7203ca203cc203cd203ce203cf203d5203d7203e1203e2203e5203f4203f5203f7204005d4015d4055d4065d4075d4085d4245d43a5d43c5d43e5d440044490944a0944c0944d0944f094510e4520e458174591745a1745b1745c1745d1745f174601d4611d4631d468214692146a2146b2146d2147122477224783e4793e47a3e47b3e47c3e4802f4842f4852f4862f488434894348a4348b4348c4348d4348e4349044491444934449444495444981649d164a0484a1484a2484a3484a4484a5484a9544ab544ac544b0554b1554b3554b85a4b95a4ba5a4bb5a4bc5a4bd5a4c04e4c34e4c44e4c8154ca274cc234d0354d2375004b50114502315033450447505505075f5085b510085111b5141f600056800a682396832d702077043b7063070a3c70c3f70e0f7104c7114c7164c7174c71b4671c4672826732287352873829739297402c7422c7442c748327503675842760407694f76b4f76c4f76d4f77053778567801278112782127891279a127bb127bc127c0037c1037c2037c3037c4037c5037c6037c7037ca037cf0380024801248402b8412b8422b8452b8462b8472b84b2b84c2b8502b8512b85c2b85d2b8612b8622b8632b8672b8682b8692b86c2b86d2b86e2b8722b8742b880588815888358884588855888860894068950d8965c899578a025a005ea015ea025ea035ea045ea055ea065ea075ea085ea095ea0a5ea0b5ea0c5ea0d5ea0e5ea0f5ea105ea115ea125ea145ea155ea165ea175ea185ea1a5ea1b5ea1c5ea1d5ea1e5ea1f5ea215ea225ea245ea255ea265ea275ea285ea295ea2a5ea2b5ea2c5ea2d5ea2e5ea2f5ea305ea315ea325ea345ea355ea365ea375ea385ea395ea3a5ea3c5ea3d5ea3e5ea3f5ea405ea415ea425ea435ea445ea455ea465ea475ea485ea4b5ea4c5ea4d5ea4f5ea505ea515ea525ea535ea545ea555ea565ea575ea585ea595ea5a5ea5b5ea5c5ea5d5ea5f5ea605ea645ea655ea665ea675ea685ea695ea6a5ea6b5ea6c5ea6d5ea6e5ea6f5ea705ea715ea725ea735ea745ea755ea765ea775ea785ea795ea7a5ea7b5ea7c5ea7d5ea7e5ea7f5ea805ea815ea825ea855ea875ea885ea895ea8a5ea8b5ea8c5ea8d5ea8e5ea8f5ea905ea925ea945ea955ea965ea975ea995ea9b5ea9c5ea9f5eaa05eaa15eaa35eaa45eaa55eaa65eaa75eaa85eaa95eaaa5eaab5eaac5eaad5eaae5eaaf5eab05eab15eab25eab35eab45eab55eab65eab75eab85eab95eaba5eabb5eabc5eabd5eabe5eabf5eac05eac25eac35eac45eac55eac65eac75eac85eaca5eacb5eacc5eacd5eacf5ead05ead15ead25ead35ead45ead55ead65ead75ead85ead95eada5eadb5eadc5eadd5eade5eadf5eae05eae15eae65ec0010c0110c0210c0310c0410c0510c0610c0710c0810c813dc823de0302e0602e0702e0802e0b02e480ce490ce4a0ce8011e8419e940b';

const TABLE: Record<string, string> = {};
for (let i = 0; i < PACKED.length; i += 5) {
  TABLE[PACKED.slice(i, i + 3)] = COUNTRIES[parseInt(PACKED.slice(i + 3, i + 5), 16)];
}

/** Country of registration, or undefined when the block is not one we know. */
export function countryForIcao(icao: string): string | undefined {
  return TABLE[icao.slice(0, 3).toLowerCase()];
}
