import { Card, SvgMapCardOptions, CardType } from '../../../shared/types';
import { createSvgMapCard } from './cardDefaults';

// Extract country data from Europe SVG
export const europeCountries = [
  { id: 'AL', name: 'Albania' },
  { id: 'AD', name: 'Andorra' },
  { id: 'AM', name: 'Armenia' },
  { id: 'AT', name: 'Austria' },
  { id: 'BE', name: 'Belgium' },
  { id: 'BG', name: 'Bulgaria' },
  { id: 'BA', name: 'Bosnia and Herzegovina' },
  { id: 'BY', name: 'Belarus' },
  { id: 'CH', name: 'Switzerland' },
  { id: 'CZ', name: 'Czech Republic' },
  { id: 'DE', name: 'Germany' },
  { id: 'DK', name: 'Denmark' },
  { id: 'EE', name: 'Estonia' },
  { id: 'FI', name: 'Finland' },
  { id: 'GB', name: 'United Kingdom' },
  { id: 'GE', name: 'Georgia' },
  { id: 'GR', name: 'Greece' },
  { id: 'HR', name: 'Croatia' },
  { id: 'HU', name: 'Hungary' },
  { id: 'IE', name: 'Ireland' },
  { id: 'IS', name: 'Iceland' },
  { id: 'IT', name: 'Italy' },
  { id: 'LI', name: 'Liechtenstein' },
  { id: 'LT', name: 'Lithuania' },
  { id: 'LU', name: 'Luxembourg' },
  { id: 'LV', name: 'Latvia' },
  { id: 'MD', name: 'Moldova' },
  { id: 'MK', name: 'Macedonia' },
  { id: 'ME', name: 'Montenegro' },
  { id: 'NO', name: 'Norway' },
  { id: 'PL', name: 'Poland' },
  { id: 'PT', name: 'Portugal' },
  { id: 'RO', name: 'Romania' },
  { id: 'RS', name: 'Serbia' },
  { id: 'SK', name: 'Slovakia' },
  { id: 'SI', name: 'Slovenia' },
  { id: 'SE', name: 'Sweden' },
  { id: 'TR', name: 'Turkey' },
  { id: 'UA', name: 'Ukraine' },
  { id: 'XK', name: 'Kosovo' },
  { id: 'NL', name: 'Netherlands' },
  { id: 'ES', name: 'Spain' },
  { id: 'FR', name: 'France' },
  { id: 'CY', name: 'Cyprus' }
];

// World countries data - only includes countries that actually exist in world.svg
export const worldCountries = [
  { id: 'AL', name: 'Albania' },
  { id: 'DZ', name: 'Algeria' },
  { id: 'AM', name: 'Armenia' },
  { id: 'AT', name: 'Austria' },
  { id: 'AE', name: 'United Arab Emirates' },
  { id: 'BD', name: 'Bangladesh' },
  { id: 'BE', name: 'Belgium' },
  { id: 'BJ', name: 'Benin' },
  { id: 'BF', name: 'Burkina Faso' },
  { id: 'BG', name: 'Bulgaria' },
  { id: 'BI', name: 'Burundi' },
  { id: 'BN', name: 'Brunei' },
  { id: 'BT', name: 'Bhutan' },
  { id: 'BY', name: 'Belarus' },
  { id: 'BZ', name: 'Belize' },
  { id: 'BO', name: 'Bolivia' },
  { id: 'BR', name: 'Brazil' },
  { id: 'BW', name: 'Botswana' },
  { id: 'BA', name: 'Bosnia and Herzegovina' },
  { id: 'BH', name: 'Bahrain' },
  { id: 'CA', name: 'Canada' },
  { id: 'CH', name: 'Switzerland' },
  { id: 'CL', name: 'Chile' },
  { id: 'CN', name: 'China' },
  { id: 'CI', name: 'Côte d\'Ivoire' },
  { id: 'CM', name: 'Cameroon' },
  { id: 'CG', name: 'Congo' },
  { id: 'CO', name: 'Colombia' },
  { id: 'CR', name: 'Costa Rica' },
  { id: 'CU', name: 'Cuba' },
  { id: 'CZ', name: 'Czech Republic' },
  { id: 'DE', name: 'Germany' },
  { id: 'DJ', name: 'Djibouti' },
  { id: 'DK', name: 'Denmark' },
  { id: 'DO', name: 'Dominican Republic' },
  { id: 'EC', name: 'Ecuador' },
  { id: 'EG', name: 'Egypt' },
  { id: 'ER', name: 'Eritrea' },
  { id: 'EE', name: 'Estonia' },
  { id: 'ET', name: 'Ethiopia' },
  { id: 'FI', name: 'Finland' },
  { id: 'FR', name: 'France' },
  { id: 'GA', name: 'Gabon' },
  { id: 'GB', name: 'United Kingdom' },
  { id: 'GE', name: 'Georgia' },
  { id: 'GH', name: 'Ghana' },
  { id: 'GL', name: 'Greenland' },
  { id: 'GM', name: 'Gambia' },
  { id: 'GN', name: 'Guinea' },
  { id: 'GW', name: 'Guinea-Bissau' },
  { id: 'GQ', name: 'Equatorial Guinea' },
  { id: 'GR', name: 'Greece' },
  { id: 'GT', name: 'Guatemala' },
  { id: 'GY', name: 'Guyana' },
  { id: 'HN', name: 'Honduras' },
  { id: 'HR', name: 'Croatia' },
  { id: 'HT', name: 'Haiti' },
  { id: 'HU', name: 'Hungary' },
  { id: 'ID', name: 'Indonesia' },
  { id: 'IN', name: 'India' },
  { id: 'IE', name: 'Ireland' },
  { id: 'IR', name: 'Iran' },
  { id: 'IQ', name: 'Iraq' },
  { id: 'IS', name: 'Iceland' },
  { id: 'IL', name: 'Israel' },
  { id: 'IT', name: 'Italy' },
  { id: 'JM', name: 'Jamaica' },
  { id: 'JO', name: 'Jordan' },
  { id: 'JP', name: 'Japan' },
  { id: 'KZ', name: 'Kazakhstan' },
  { id: 'KE', name: 'Kenya' },
  { id: 'KG', name: 'Kyrgyzstan' },
  { id: 'KH', name: 'Cambodia' },
  { id: 'KP', name: 'North Korea' },
  { id: 'KR', name: 'South Korea' },
  { id: 'KW', name: 'Kuwait' },
  { id: 'LA', name: 'Laos' },
  { id: 'LB', name: 'Lebanon' },
  { id: 'LR', name: 'Liberia' },
  { id: 'LY', name: 'Libya' },
  { id: 'LK', name: 'Sri Lanka' },
  { id: 'LS', name: 'Lesotho' },
  { id: 'LT', name: 'Lithuania' },
  { id: 'LU', name: 'Luxembourg' },
  { id: 'LV', name: 'Latvia' },
  { id: 'MA', name: 'Morocco' },
  { id: 'MD', name: 'Moldova' },
  { id: 'MG', name: 'Madagascar' },
  { id: 'MX', name: 'Mexico' },
  { id: 'MK', name: 'North Macedonia' },
  { id: 'ML', name: 'Mali' },
  { id: 'MM', name: 'Myanmar' },
  { id: 'ME', name: 'Montenegro' },
  { id: 'MN', name: 'Mongolia' },
  { id: 'MZ', name: 'Mozambique' },
  { id: 'MR', name: 'Mauritania' },
  { id: 'MW', name: 'Malawi' },
  { id: 'MY', name: 'Malaysia' },
  { id: 'NA', name: 'Namibia' },
  { id: 'NE', name: 'Niger' },
  { id: 'NG', name: 'Nigeria' },
  { id: 'NI', name: 'Nicaragua' },
  { id: 'NL', name: 'Netherlands' },
  { id: 'NO', name: 'Norway' },
  { id: 'NP', name: 'Nepal' },
  { id: 'NZ', name: 'New Zealand' },
  { id: 'OM', name: 'Oman' },
  { id: 'PA', name: 'Panama' },
  { id: 'PE', name: 'Peru' },
  { id: 'PH', name: 'Philippines' },
  { id: 'PK', name: 'Pakistan' },
  { id: 'PL', name: 'Poland' },
  { id: 'PT', name: 'Portugal' },
  { id: 'PY', name: 'Paraguay' },
  { id: 'PS', name: 'Palestine' },
  { id: 'QA', name: 'Qatar' },
  { id: 'RO', name: 'Romania' },
  { id: 'RU', name: 'Russia' },
  { id: 'RW', name: 'Rwanda' },
  { id: 'EH', name: 'Western Sahara' },
  { id: 'SA', name: 'Saudi Arabia' },
  { id: 'SD', name: 'Sudan' },
  { id: 'SS', name: 'South Sudan' },
  { id: 'SN', name: 'Senegal' },
  { id: 'SL', name: 'Sierra Leone' },
  { id: 'SV', name: 'El Salvador' },
  { id: 'RS', name: 'Serbia' },
  { id: 'SR', name: 'Suriname' },
  { id: 'SK', name: 'Slovakia' },
  { id: 'SI', name: 'Slovenia' },
  { id: 'SE', name: 'Sweden' },
  { id: 'SZ', name: 'Eswatini' },
  { id: 'SY', name: 'Syria' },
  { id: 'TD', name: 'Chad' },
  { id: 'TG', name: 'Togo' },
  { id: 'TH', name: 'Thailand' },
  { id: 'TJ', name: 'Tajikistan' },
  { id: 'TM', name: 'Turkmenistan' },
  { id: 'TL', name: 'Timor-Leste' },
  { id: 'TN', name: 'Tunisia' },
  { id: 'TR', name: 'Turkey' },
  { id: 'TW', name: 'Taiwan' },
  { id: 'TZ', name: 'Tanzania' },
  { id: 'UG', name: 'Uganda' },
  { id: 'UA', name: 'Ukraine' },
  { id: 'UY', name: 'Uruguay' },
  { id: 'US', name: 'United States' },
  { id: 'UZ', name: 'Uzbekistan' },
  { id: 'VE', name: 'Venezuela' },
  { id: 'VN', name: 'Vietnam' },
  { id: 'YE', name: 'Yemen' },
  { id: 'ZA', name: 'South Africa' },
  { id: 'ZM', name: 'Zambia' },
  { id: 'ZW', name: 'Zimbabwe' },
  { id: 'SO', name: 'Somalia' },
  { id: 'XK', name: 'Kosovo' },
  { id: 'ES', name: 'Spain' }
];

// Africa countries data
export const africaCountries = [
  { id: 'DZ', name: 'Algeria' },
  { id: 'AO', name: 'Angola' },
  { id: 'BJ', name: 'Benin' },
  { id: 'BW', name: 'Botswana' },
  { id: 'BF', name: 'Burkina Faso' },
  { id: 'BI', name: 'Burundi' },
  { id: 'CV', name: 'Cape Verde' },
  { id: 'CM', name: 'Cameroon' },
  { id: 'CF', name: 'Central African Republic' },
  { id: 'TD', name: 'Chad' },
  { id: 'KM', name: 'Comoros' },
  { id: 'CG', name: 'Congo' },
  { id: 'CD', name: 'Democratic Republic of the Congo' },
  { id: 'CI', name: 'Côte d\'Ivoire' },
  { id: 'DJ', name: 'Djibouti' },
  { id: 'EG', name: 'Egypt' },
  { id: 'GQ', name: 'Equatorial Guinea' },
  { id: 'ER', name: 'Eritrea' },
  { id: 'ET', name: 'Ethiopia' },
  { id: 'GA', name: 'Gabon' },
  { id: 'GM', name: 'Gambia' },
  { id: 'GH', name: 'Ghana' },
  { id: 'GN', name: 'Guinea' },
  { id: 'GW', name: 'Guinea-Bissau' },
  { id: 'KE', name: 'Kenya' },
  { id: 'LS', name: 'Lesotho' },
  { id: 'LR', name: 'Liberia' },
  { id: 'LY', name: 'Libya' },
  { id: 'MG', name: 'Madagascar' },
  { id: 'MW', name: 'Malawi' },
  { id: 'ML', name: 'Mali' },
  { id: 'MR', name: 'Mauritania' },
  { id: 'MU', name: 'Mauritius' },
  { id: 'MA', name: 'Morocco' },
  { id: 'MZ', name: 'Mozambique' },
  { id: 'NA', name: 'Namibia' },
  { id: 'NE', name: 'Niger' },
  { id: 'NG', name: 'Nigeria' },
  { id: 'RW', name: 'Rwanda' },
  { id: 'ST', name: 'São Tomé and Príncipe' },
  { id: 'SN', name: 'Senegal' },
  { id: 'SC', name: 'Seychelles' },
  { id: 'SL', name: 'Sierra Leone' },
  { id: 'SO', name: 'Somalia' },
  { id: 'ZA', name: 'South Africa' },
  { id: 'SS', name: 'South Sudan' },
  { id: 'SD', name: 'Sudan' },
  { id: 'SZ', name: 'Eswatini' },
  { id: 'TZ', name: 'Tanzania' },
  { id: 'TG', name: 'Togo' },
  { id: 'TN', name: 'Tunisia' },
  { id: 'UG', name: 'Uganda' },
  { id: 'ZM', name: 'Zambia' },
  { id: 'ZW', name: 'Zimbabwe' }
];

// North America countries data
export const northAmericaCountries = [
  { id: 'AG', name: 'Antigua and Barbuda' },
  { id: 'BS', name: 'Bahamas' },
  { id: 'BB', name: 'Barbados' },
  { id: 'BZ', name: 'Belize' },
  { id: 'CA', name: 'Canada' },
  { id: 'CR', name: 'Costa Rica' },
  { id: 'CU', name: 'Cuba' },
  { id: 'DM', name: 'Dominica' },
  { id: 'DO', name: 'Dominican Republic' },
  { id: 'SV', name: 'El Salvador' },
  { id: 'GD', name: 'Grenada' },
  { id: 'GT', name: 'Guatemala' },
  { id: 'HT', name: 'Haiti' },
  { id: 'HN', name: 'Honduras' },
  { id: 'JM', name: 'Jamaica' },
  { id: 'MX', name: 'Mexico' },
  { id: 'NI', name: 'Nicaragua' },
  { id: 'PA', name: 'Panama' },
  { id: 'KN', name: 'Saint Kitts and Nevis' },
  { id: 'LC', name: 'Saint Lucia' },
  { id: 'VC', name: 'Saint Vincent and the Grenadines' },
  { id: 'TT', name: 'Trinidad and Tobago' },
  { id: 'US', name: 'United States' }
];

// Individual country maps (these would be regions/states/provinces within the country)
export const finlandRegions = [
  { id: 'FI-01', name: 'Åland' },
  { id: 'FI-02', name: 'South Karelia' },
  { id: 'FI-03', name: 'Southern Ostrobothnia' },
  { id: 'FI-04', name: 'Southern Savonia' },
  { id: 'FI-05', name: 'Kainuu' },
  { id: 'FI-06', name: 'Tavastia Proper' },
  { id: 'FI-07', name: 'Central Ostrobothnia' },
  { id: 'FI-08', name: 'Central Finland' },
  { id: 'FI-09', name: 'Kymenlaakso' },
  { id: 'FI-10', name: 'Lapland' },
  { id: 'FI-11', name: 'Pirkanmaa' },
  { id: 'FI-12', name: 'Ostrobothnia' },
  { id: 'FI-13', name: 'North Karelia' },
  { id: 'FI-14', name: 'Northern Ostrobothnia' },
  { id: 'FI-15', name: 'Northern Savonia' },
  { id: 'FI-16', name: 'Päijät-Häme' },
  { id: 'FI-17', name: 'Satakunta' },
  { id: 'FI-18', name: 'Uusimaa' },
  { id: 'FI-19', name: 'Southwest Finland' }
];

export const franceRegions = [
  { id: 'FR-ARA', name: 'Auvergne-Rhône-Alpes' },
  { id: 'FR-BFC', name: 'Bourgogne-Franche-Comté' },
  { id: 'FR-BRE', name: 'Brittany' },
  { id: 'FR-CVL', name: 'Centre-Val de Loire' },
  { id: 'FR-COR', name: 'Corsica' },
  { id: 'FR-GES', name: 'Grand Est' },
  { id: 'FR-HDF', name: 'Hauts-de-France' },
  { id: 'FR-IDF', name: 'Île-de-France' },
  { id: 'FR-NOR', name: 'Normandy' },
  { id: 'FR-NAQ', name: 'Nouvelle-Aquitaine' },
  { id: 'FR-OCC', name: 'Occitania' },
  { id: 'FR-PDL', name: 'Pays de la Loire' },
  { id: 'FR-PAC', name: 'Provence-Alpes-Côte d\'Azur' }
];

export const ukRegions = [
  { id: 'GB-ENG', name: 'England' },
  { id: 'GB-SCT', name: 'Scotland' },
  { id: 'GB-WLS', name: 'Wales' },
  { id: 'GB-NIR', name: 'Northern Ireland' }
];

export const norwayRegions = [
  { id: 'NO-03', name: 'Oslo' },
  { id: 'NO-11', name: 'Rogaland' },
  { id: 'NO-15', name: 'Møre og Romsdal' },
  { id: 'NO-18', name: 'Nordland' },
  { id: 'NO-30', name: 'Viken' },
  { id: 'NO-34', name: 'Innlandet' },
  { id: 'NO-38', name: 'Vestfold og Telemark' },
  { id: 'NO-42', name: 'Agder' },
  { id: 'NO-46', name: 'Vestland' },
  { id: 'NO-50', name: 'Trøndelag' },
  { id: 'NO-54', name: 'Troms og Finnmark' }
];

export const swedenRegions = [
  { id: 'SE-AB', name: 'Stockholm' },
  { id: 'SE-C', name: 'Uppsala' },
  { id: 'SE-D', name: 'Södermanland' },
  { id: 'SE-E', name: 'Östergötland' },
  { id: 'SE-F', name: 'Jönköping' },
  { id: 'SE-G', name: 'Kronoberg' },
  { id: 'SE-H', name: 'Kalmar' },
  { id: 'SE-I', name: 'Gotland' },
  { id: 'SE-K', name: 'Blekinge' },
  { id: 'SE-M', name: 'Skåne' },
  { id: 'SE-N', name: 'Halland' },
  { id: 'SE-O', name: 'Västra Götaland' },
  { id: 'SE-S', name: 'Värmland' },
  { id: 'SE-T', name: 'Örebro' },
  { id: 'SE-U', name: 'Västmanland' },
  { id: 'SE-W', name: 'Dalarna' },
  { id: 'SE-X', name: 'Gävleborg' },
  { id: 'SE-Y', name: 'Västernorrland' },
  { id: 'SE-Z', name: 'Jämtland' },
  { id: 'SE-AC', name: 'Västerbotten' },
  { id: 'SE-BD', name: 'Norrbotten' }
];

export const usStates = [
  { id: 'US-AL', name: 'Alabama' },
  { id: 'US-AK', name: 'Alaska' },
  { id: 'US-AZ', name: 'Arizona' },
  { id: 'US-AR', name: 'Arkansas' },
  { id: 'US-CA', name: 'California' },
  { id: 'US-CO', name: 'Colorado' },
  { id: 'US-CT', name: 'Connecticut' },
  { id: 'US-DE', name: 'Delaware' },
  { id: 'US-FL', name: 'Florida' },
  { id: 'US-GA', name: 'Georgia' },
  { id: 'US-HI', name: 'Hawaii' },
  { id: 'US-ID', name: 'Idaho' },
  { id: 'US-IL', name: 'Illinois' },
  { id: 'US-IN', name: 'Indiana' },
  { id: 'US-IA', name: 'Iowa' },
  { id: 'US-KS', name: 'Kansas' },
  { id: 'US-KY', name: 'Kentucky' },
  { id: 'US-LA', name: 'Louisiana' },
  { id: 'US-ME', name: 'Maine' },
  { id: 'US-MD', name: 'Maryland' },
  { id: 'US-MA', name: 'Massachusetts' },
  { id: 'US-MI', name: 'Michigan' },
  { id: 'US-MN', name: 'Minnesota' },
  { id: 'US-MS', name: 'Mississippi' },
  { id: 'US-MO', name: 'Missouri' },
  { id: 'US-MT', name: 'Montana' },
  { id: 'US-NE', name: 'Nebraska' },
  { id: 'US-NV', name: 'Nevada' },
  { id: 'US-NH', name: 'New Hampshire' },
  { id: 'US-NJ', name: 'New Jersey' },
  { id: 'US-NM', name: 'New Mexico' },
  { id: 'US-NY', name: 'New York' },
  { id: 'US-NC', name: 'North Carolina' },
  { id: 'US-ND', name: 'North Dakota' },
  { id: 'US-OH', name: 'Ohio' },
  { id: 'US-OK', name: 'Oklahoma' },
  { id: 'US-OR', name: 'Oregon' },
  { id: 'US-PA', name: 'Pennsylvania' },
  { id: 'US-RI', name: 'Rhode Island' },
  { id: 'US-SC', name: 'South Carolina' },
  { id: 'US-SD', name: 'South Dakota' },
  { id: 'US-TN', name: 'Tennessee' },
  { id: 'US-TX', name: 'Texas' },
  { id: 'US-UT', name: 'Utah' },
  { id: 'US-VT', name: 'Vermont' },
  { id: 'US-VA', name: 'Virginia' },
  { id: 'US-WA', name: 'Washington' },
  { id: 'US-WV', name: 'West Virginia' },
  { id: 'US-WI', name: 'Wisconsin' },
  { id: 'US-WY', name: 'Wyoming' }
];

export const vietnamProvinces = [
  { id: 'VN-44', name: 'An Giang' },
  { id: 'VN-43', name: 'Bà Rịa-Vũng Tàu' },
  { id: 'VN-54', name: 'Bắc Giang' },
  { id: 'VN-53', name: 'Bắc Kạn' },
  { id: 'VN-55', name: 'Bắc Liêu' },
  { id: 'VN-56', name: 'Bắc Ninh' },
  { id: 'VN-50', name: 'Bến Tre' },
  { id: 'VN-31', name: 'Bình Định' },
  { id: 'VN-57', name: 'Bình Dương' },
  { id: 'VN-58', name: 'Bình Phước' },
  { id: 'VN-40', name: 'Bình Thuận' },
  { id: 'VN-59', name: 'Cà Mau' },
  { id: 'VN-CT', name: 'Cần Thơ' },
  { id: 'VN-04', name: 'Cao Bằng' },
  { id: 'VN-DN', name: 'Đà Nẵng' },
  { id: 'VN-33', name: 'Đắk Lắk' },
  { id: 'VN-72', name: 'Đắk Nông' },
  { id: 'VN-71', name: 'Điện Biên' },
  { id: 'VN-39', name: 'Đồng Nai' },
  { id: 'VN-45', name: 'Đồng Tháp' },
  { id: 'VN-30', name: 'Gia Lai' },
  { id: 'VN-03', name: 'Hà Giang' },
  { id: 'VN-63', name: 'Hà Nam' },
  { id: 'HN', name: 'Hà Nội' },
  { id: 'VN-23', name: 'Hà Tĩnh' },
  { id: 'VN-61', name: 'Hải Dương' },
  { id: 'VN-HP', name: 'Hải Phòng' },
  { id: 'VN-73', name: 'Hậu Giang' },
  { id: 'VN-SG', name: 'Hồ Chí Minh' },
  { id: 'VN-14', name: 'Hòa Bình' },
  { id: 'VN-66', name: 'Hưng Yên' },
  { id: 'VN-34', name: 'Khánh Hòa' },
  { id: 'VN-47', name: 'Kiên Giang' },
  { id: 'VN-28', name: 'Kon Tum' },
  { id: 'VN-01', name: 'Lai Châu' },
  { id: 'VN-35', name: 'Lâm Đồng' },
  { id: 'VN-09', name: 'Lạng Sơn' },
  { id: 'VN-02', name: 'Lào Cai' },
  { id: 'VN-41', name: 'Long An' },
  { id: 'VN-67', name: 'Nam Định' },
  { id: 'VN-22', name: 'Nghệ An' },
  { id: 'VN-18', name: 'Ninh Bình' },
  { id: 'VN-36', name: 'Ninh Thuận' },
  { id: 'VN-68', name: 'Phú Thọ' },
  { id: 'VN-32', name: 'Phú Yên' },
  { id: 'VN-24', name: 'Quảng Bình' },
  { id: 'VN-27', name: 'Quảng Nam' },
  { id: 'VN-29', name: 'Quảng Ngãi' },
  { id: 'VN-13', name: 'Quảng Ninh' },
  { id: 'VN-25', name: 'Quảng Trị' },
  { id: 'VN-52', name: 'Sóc Trăng' },
  { id: 'VN-05', name: 'Sơn La' },
  { id: 'VN-37', name: 'Tây Ninh' },
  { id: 'VN-20', name: 'Thái Bình' },
  { id: 'VN-69', name: 'Thái Nguyên' },
  { id: 'VN-21', name: 'Thanh Hóa' },
  { id: 'VN-26', name: 'Thừa Thiên Huế' },
  { id: 'VN-46', name: 'Tiền Giang' },
  { id: 'VN-51', name: 'Trà Vinh' },
  { id: 'VN-07', name: 'Tuyên Quang' },
  { id: 'VN-49', name: 'Vĩnh Long' },
  { id: 'VN-70', name: 'Vĩnh Phúc' },
  { id: 'VN-06', name: 'Yên Bái' }
];

export interface SvgMapConfig {
  id: string;
  mapId: string;
  name: string;
  mapName: string;
  description: string;
  emoji: string;
  svgPath: string;
  regions: Array<{ id: string; name: string }>;
  countries: Array<{ id: string; name: string }>;
}

export const availableMaps: SvgMapConfig[] = [
  {
    id: 'europe',
    mapId: 'europe',
    name: 'Europe',
    mapName: 'Europe',
    description: 'Learn all 44 European countries with interactive maps',
    emoji: '🇪🇺',
    svgPath: '/europe.svg',
    regions: europeCountries,
    countries: europeCountries
  },
  {
    id: 'world',
    mapId: 'world',
    name: 'World',
    mapName: 'World',
    description: 'Master geography of all 195+ countries worldwide',
    emoji: '🌍',
    svgPath: '/world.svg',
    regions: worldCountries,
    countries: worldCountries
  },
  {
    id: 'africa',
    mapId: 'africa',
    name: 'Africa',
    mapName: 'Africa',
    description: 'Explore all 54 African countries and their locations',
    emoji: '🌍',
    svgPath: '/africa.svg',
    regions: africaCountries,
    countries: africaCountries
  },
  {
    id: 'north-america',
    mapId: 'north-america',
    name: 'North America',
    mapName: 'North America',
    description: 'Learn 23 North American countries and territories',
    emoji: '🌎',
    svgPath: '/north-america.svg',
    regions: northAmericaCountries,
    countries: northAmericaCountries
  },
  {
    id: 'finland',
    mapId: 'finland',
    name: 'Finland Regions',
    mapName: 'Finland Regions',
    description: 'Master all 19 Finnish regions and their locations',
    emoji: '🇫🇮',
    svgPath: '/fi.svg',
    regions: finlandRegions,
    countries: finlandRegions
  },
  {
    id: 'france',
    mapId: 'france',
    name: 'France Regions',
    mapName: 'France Regions',
    description: 'Learn the 13 administrative regions of France',
    emoji: '🇫🇷',
    svgPath: '/fr.svg',
    regions: franceRegions,
    countries: franceRegions
  },
  {
    id: 'united-kingdom',
    mapId: 'united-kingdom',
    name: 'United Kingdom',
    mapName: 'United Kingdom',
    description: 'Identify the 4 constituent countries of the UK',
    emoji: '🇬🇧',
    svgPath: '/gb.svg',
    regions: ukRegions,
    countries: ukRegions
  },
  {
    id: 'norway',
    mapId: 'norway',
    name: 'Norway Regions',
    mapName: 'Norway Regions',
    description: 'Explore the 11 counties (fylker) of Norway',
    emoji: '🇳🇴',
    svgPath: '/no.svg',
    regions: norwayRegions,
    countries: norwayRegions
  },
  {
    id: 'sweden',
    mapId: 'sweden',
    name: 'Sweden Regions',
    mapName: 'Sweden Regions',
    description: 'Learn all 21 Swedish counties (län)',
    emoji: '🇸🇪',
    svgPath: '/se.svg',
    regions: swedenRegions,
    countries: swedenRegions
  },
  {
    id: 'united-states',
    mapId: 'united-states',
    name: 'United States',
    mapName: 'United States',
    description: 'Master all 50 US states and their locations',
    emoji: '🇺🇸',
    svgPath: '/us.svg',
    regions: usStates,
    countries: usStates
  },
  {
    id: 'vietnam',
    mapId: 'vietnam',
    name: 'Vietnam Provinces',
    mapName: 'Vietnam Provinces',
    description: 'Learn all 63 provinces and cities of Vietnam',
    emoji: '🇻🇳',
    svgPath: '/vn.svg',
    regions: vietnamProvinces,
    countries: vietnamProvinces
  }
];

/**
 * Generate SVG map cards for a specific map
 */
export function generateSvgMapCards(
  deckId: string,
  mapConfig: SvgMapConfig
): Card[] {
  const cards: Card[] = [];

  mapConfig.countries.forEach((country) => {
    const cardOptions: SvgMapCardOptions = {
      mapId: mapConfig.mapId,
      countryId: country.id,
      countryName: country.name,
      svgPath: mapConfig.svgPath
    };

    const card = createSvgMapCard(
      `${deckId}_${mapConfig.mapId}_${country.id}`,
      deckId,
      `Identify the highlighted region in ${mapConfig.mapName}`,
      country.name,
      {
        type: 'svg_map',
        options: cardOptions
      },
      []
    );

    cards.push(card);
  });

  return cards;
}

/**
 * Generate cards for all available maps
 */
export function generateAllSvgMapCards(deckId: string): Card[] {
  const allCards: Card[] = [];

  availableMaps.forEach((mapConfig) => {
    const mapCards = generateSvgMapCards(deckId, mapConfig);
    allCards.push(...mapCards);
  });

  return allCards;
}

/**
 * Get map configuration by ID
 */
export function getMapConfig(mapId: string): SvgMapConfig | undefined {
  return availableMaps.find(map => map.mapId === mapId);
}

/**
 * Get country information by map and country ID
 */
export function getCountryInfo(mapId: string, countryId: string): { id: string; name: string } | undefined {
  const mapConfig = getMapConfig(mapId);
  if (!mapConfig) return undefined;
  
  return mapConfig.countries.find(country => country.id === countryId);
}

/**
 * Generate a complete map deck for any available map
 */
interface DeckData {
  id?: string;
  userId: string;
  title: string;
  description: string;
  cardCount: number;
  isPublic: boolean;
  category?: string;
  settings: Record<string, unknown>;
}

interface CardData {
  frontContent: string;
  backContent: string;
  cardType: CardType;
  options?: Record<string, unknown>;
}

export async function generateMapDeck(mapId: string, createDeck: (deckData: DeckData) => Promise<DeckData>, addCard?: (cardData: CardData) => Promise<CardData>) {
  const mapConfig = getMapConfig(mapId);
  if (!mapConfig) {
    throw new Error(`Map configuration for '${mapId}' not found`);
  }

  // Create the deck
  const deck = await createDeck({
    userId: 'current-user',
    title: `${mapConfig.mapName} Geography`,
    description: `Learn all regions in ${mapConfig.mapName} with interactive maps. Each card shows a highlighted region that you need to identify.`,
    cardCount: mapConfig.countries.length,
    isPublic: false,
    settings: {
      newCardsPerDay: 20,
      maxReviewsPerDay: 100,
      easyBonus: 1.3,
      intervalModifier: 1.0,
      maximumInterval: 36500,
      minimumInterval: 1
    },
    category: 'geography'
  });

  // If addCard function is provided, add all the SVG map cards
  if (addCard && deck.id) {
    const cards = generateSvgMapCards(deck.id, mapConfig);
    
    // Add cards one by one if addCard function is provided
    if (addCard) {
      for (const card of cards) {
        await addCard(card);
      }
    }
  }

  return deck;
}

/**
 * Generate a complete Europe map deck (backward compatibility)
 */
export async function generateEuropeMapDeck(createDeck: (deckData: DeckData) => Promise<DeckData>, addCard?: (cardData: CardData) => Promise<CardData>) {
  return generateMapDeck('europe', createDeck, addCard);
}