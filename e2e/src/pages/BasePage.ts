import { Locator, Page, Response } from '@playwright/test';
import { Header } from '../components/Header';

type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'DELETE';

/** Describe una llamada a la API que dispara la pantalla: método y ruta (sin query string). */
export interface ApiCall {
  method: HttpMethod;
  path: string | RegExp;
}

function matches(call: ApiCall) {
  return (response: Response): boolean => {
    if (response.request().method() !== call.method) return false;
    const { pathname } = new URL(response.url());
    return typeof call.path === 'string' ? pathname === call.path : call.path.test(pathname);
  };
}

export abstract class BasePage {
  readonly header: Header;
  readonly loading: Locator;

  constructor(readonly page: Page) {
    this.header = new Header(page);
    this.loading = page.getByTestId('loading');
  }

  /**
   * Ejecuta una acción de la UI que escribe en la API y espera a que la pantalla
   * termine de reaccionar: la respuesta de la escritura y, si fue exitosa, la
   * recarga que la pantalla hace a continuación.
   *
   * Sin esta espera una aserción como `toHaveCount(1)` podría evaluarse contra la
   * lista anterior a la recarga y dar un falso positivo.
   */
  protected async mutate(
    action: () => Promise<unknown>,
    write: ApiCall,
    reload?: ApiCall,
  ): Promise<Response> {
    const reloaded = reload ? this.page.waitForResponse(matches(reload)) : undefined;
    // Si la escritura falla la pantalla no recarga: esta espera queda sin usar.
    reloaded?.catch(() => undefined);

    const [response] = await Promise.all([this.page.waitForResponse(matches(write)), action()]);
    if (reloaded && response.ok()) await reloaded;
    return response;
  }

  /** Espera la lectura que dispara `action` (por ejemplo, aplicar filtros). */
  protected async read(action: () => Promise<unknown>, call: ApiCall): Promise<Response> {
    const [response] = await Promise.all([this.page.waitForResponse(matches(call)), action()]);
    return response;
  }
}

/** Regex que exige el texto completo, para no confundir 'Tarea 1' con 'Tarea 10'. */
export function exactText(text: string): RegExp {
  return new RegExp(`^${text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`);
}
