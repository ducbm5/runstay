export interface Hotel {
  id: string;
  update_time: string;
  url: string;
  name: string;
  gallery_html: string;
  description_html: string;
  map_url?: string;
  location?: string;
  location_id?: string;
  hotel_id?: string;
}

export const TSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQT7lw-MzWC0abldDLbCtrIgreJhcEnYPGt7a8vKGFrR1TSAuOf7Iq3uzztoedfLIIjO6mRnS61YdOa/pub?output=tsv';

// Dán URL Web App từ Google Apps Script vào đây để lưu bình luận
export const REVIEWS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyDeymsHwW4dJvw09uhWNYxKRIlrgMi1wskK8cXndhwylwbkdF2ii6vKFbsV5FkETQDQA/exec'; 

// URL TSV để đọc bình luận
export const REVIEWS_DATA_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQTB1CnhO3PL56Av3q-qQW56Iy_G4rHOY7pWC1bBcE2fE16LjW3jzhl85RPaStwXZjHcFp58xPEECC7/pub?output=tsv';
