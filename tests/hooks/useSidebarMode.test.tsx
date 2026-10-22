import {act, renderHook} from '@testing-library/react';
import {beforeEach, describe, expect, it} from 'vitest';
import {useSidebarMode} from '@/hooks/useSidebarMode';

describe('useSidebarMode', () => {
    beforeEach(() => localStorage.clear());

    it('is open by default', () => {
        const {result} = renderHook(() => useSidebarMode());
        expect(result.current.isCollapsed).toBe(false);
    });

    it('toggles and remembers the choice', () => {
        const {result} = renderHook(() => useSidebarMode());
        act(() => result.current.toggle());
        expect(result.current.isCollapsed).toBe(true);
        expect(renderHook(() => useSidebarMode()).result.current.isCollapsed).toBe(true);
    });
});
