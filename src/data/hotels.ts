export interface Hotel {
  id: string; // Internal unique ID
  hotel_id: string; // Column A
  url: string; // Column B
  name: string; // Column C
  location: string; // Column D
  address: string; // Column E
  price: string; // Column F
  rating: string; // Column G
  stars: string; // Column H
  reviews_count: string; // Column I
  contact_name: string; // Column J
  contact_phone: string; // Column K
  gallery_html: string; // Column L
  description_html: string; // Column M
  map_url: string; // Column N
  location_id: string; // Column O
  update_time: string; // Column P
}

export const TSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQT7lw-MzWC0abldDLbCtrIgreJhcEnYPGt7a8vKGFrR1TSAuOf7Iq3uzztoedfLIIjO6mRnS61YdOa/pub?output=tsv';

// Dán URL Web App từ Google Apps Script vào đây để lưu bình luận
export const REVIEWS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyDeymsHwW4dJvw09uhWNYxKRIlrgMi1wskK8cXndhwylwbkdF2ii6vKFbsV5FkETQDQA/exec'; 

// URL TSV để đọc bình luận
export const REVIEWS_DATA_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQTB1CnhO3PL56Av3q-qQW56Iy_G4rHOY7pWC1bBcE2fE16LjW3jzhl85RPaStwXZjHcFp58xPEECC7/pub?output=tsv';
