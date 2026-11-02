import { test, expect } from '@playwright/test';

test('iOS bundle renders login, authenticates a mocked approved user, and navigates', async ({ page }) => {
  await page.route('**/cdn.jsdelivr.net/npm/@supabase/**', route => route.fulfill({status:200,contentType:'application/javascript',body:''}));
  await page.route('**/unpkg.com/**', route => route.fulfill({status:200,body:''}));
  await page.addInitScript(() => {
    const user={id:'e2e-user',email:'test@example.invalid'};
    let signedIn=false;
    const query=(table)=> {
      const api={
        select(){return api},eq(){return api},order(){return api},limit(){return api},
        maybeSingle:async()=>({data:table==='profiles'?{account_status:'active',is_admin:false,display_name:'Testperson'}:null,error:null}),
        single:async()=>({data:null,error:null}),
        then(resolve){resolve({data:[],error:null});}
      };
      return api;
    };
    window.supabase={
      createClient:()=>({
        auth:{
          getUser:async()=>({data:{user:signedIn?user:null},error:null}),
          getSession:async()=>({data:{session:signedIn?{user}:null},error:null}),
          signInWithPassword:async()=>{signedIn=true;return {data:{user},error:null}},
          signOut:async()=>{signedIn=false;return {error:null}},
          onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}})
        },
        from:query,
        rpc:async()=>({data:null,error:null}),
        functions:{invoke:async()=>({data:null,error:null})}
      })
    };
  });
  await page.goto('http://127.0.0.1:4173/index.html');
  await expect(page.locator('#appLogin')).toBeVisible();
  await page.locator('#appEmail').fill('test@example.invalid');
  await page.locator('#appPassword').fill('test-password');
  await page.locator('#appLoginSubmit').click();
  await expect(page.locator('#appLogin')).toBeHidden();
  await expect(page.locator('#profileName')).toHaveText('Testperson');
  await page.locator('[data-view="more"]').click();
  await expect(page.locator('#more')).toBeVisible();
});
