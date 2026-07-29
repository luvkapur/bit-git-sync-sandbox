import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { NebulaTheme } from '@luvktest/nebula-design.nebula-theme';
import { NebulaDesign } from "./nebula-design.js";

export const NebulaDesignAppComposition = () => {
  return (
    <MemoryRouter>
      <NebulaTheme initialTheme="light">
        <NebulaDesign />
      </NebulaTheme>
    </MemoryRouter>
  );
};