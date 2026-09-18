import { MemoryRouter } from 'react-router-dom';
import { CrmUi } from "./crm-ui.js";
    
export const CrmUiBasic = () => {
  return (
    <MemoryRouter>
      <CrmUi />
    </MemoryRouter>
  );
}